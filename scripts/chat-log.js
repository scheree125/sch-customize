async function downloadArchiveFile(chats) {

  let [htmlContent, contentImg, portraitImg] = await generateHtmlFromChats(chats);

  let zip = new JSZip();

  await zipInsideFolder(zip, contentImg, "images");
  await zipInsideFolder(zip, portraitImg, "portraits");
  zip.file("chat.html", htmlContent);

  zip.generateAsync({type:"blob"})
      .then(function(blob) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = "chats.zip";

        document.body.appendChild(a);
        a.click();

        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      });
}




async function generateHtmlFromChats(chats) {
  const response = await fetch('modules/sch-customize/template/chat-archive-template.html');
  const templateHtml = await response.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(templateHtml, 'text/html');

  const container = doc.querySelector('.foundry-chat-container');
  let prevSpeaker;
  for (const chat of chats) {
    const chatMergeFlag = prevSpeaker === chat.speaker.alias;
    appendChatContents(chat, chatMergeFlag, container);
    prevSpeaker = chat.speaker.alias;
  }

  //일회성 처리
  const inlineRollLinks = doc.querySelectorAll('a.inline-roll.inline-result');
  inlineRollLinks.forEach((link) => {
    const newDiv = doc.createElement('div');
    newDiv.className = 'inline-roll';
    newDiv.textContent = link.dataset.tooltip + '=>' + link.textContent;
    link.parentNode.insertBefore(newDiv, link.nextSibling);
    link.remove();
  });

  let contentImg = new Set([...doc.querySelectorAll('.chat-text img')]
      .map(img => img.src ? img.src :
          window.location.href.replace('game', '') + img?.getAttribute('src')));

  let portraitImg = new Set([...doc.querySelectorAll('.chat-image img')]
      .map(img => img.src ? img.src :
          window.location.href.replace('game', '') + img?.getAttribute('src')));


  //css 추가
  const selectors = getSelectors(doc);
  const styleElement = doc.createElement('style');
  styleElement.type = 'text/css';
  styleElement.appendChild(doc.createTextNode(createCssList(selectors)));

  const headElement = doc.head || doc.getElementsByTagName('head')[0];
  headElement.appendChild(styleElement);

  updateImageSources(doc);
  // 최종 HTML 문자열 반환
  return [doc.documentElement.outerHTML, contentImg, portraitImg];
}

function appendChatContents(chat, chatMergeFlag, container) {
  const {type, rolls, flags, user } = chat;
  const speaker = chat.speaker.alias;

  const text = type === 5 && rolls.length > 0 ? getRollResultContent(chat) : chat.content;
  const imageUrl = getChatImageUrl(chat);
  const privTalkFlag = flags?.priv_talk;

  const div = createDivWithClasses(['chat-box', privTalkFlag ? 'priv-talk' : null, user ? `user-${typeof user === 'string'? user : user._id}` : null]);

  const nameDiv = createDivWithClasses('chat-name', !chatMergeFlag ? [speaker] : null);
  const imageDiv = createDivWithClasses('chat-image');
  const imageElement = getChatImageElement(imageUrl, chatMergeFlag, privTalkFlag);
  if(imageElement){
    imageDiv.appendChild(imageElement);
  }
  const textDivClasses = ['chat-text', chatMergeFlag ? 'chat-merge' : null];
  const textDiv = createDivWithClasses(textDivClasses, text, true);
  appendChildren(div, [imageDiv, nameDiv, textDiv]);
  container.appendChild(div);
}

function createDivWithClasses(classes, content, isHtml) {
  const div = document.createElement('div');
  (Array.isArray(classes) ? classes : [classes]).forEach(cls => cls && div.classList.add(cls));

  if (isHtml) {
    div.innerHTML = content;
  } else if (content) {
    div.textContent = content;
  }

  return div;
}

function appendChildren(parent, children) {
  children.forEach(child => parent.appendChild(child));
}

function getChatImageUrl(chat) {
  if (chat.flags['chat-portrait']) {
    //return window.location.href.replace('game', '') + chat.flags['chat-portrait'].src;
    return chat.flags['chat-portrait'].src;
  } else if (game.actors.get(chat.speaker?.actor)?.img) {
    //return window.location.href.replace('game', '') + game.actors.get(chat.speaker?.actor).img;
    return game.actors.get(chat.speaker?.actor).img;
  }
  return null;
}

function getChatImageElement(imageUrl, chatMergeFlag, privTalkFlag) {
  if (imageUrl && !chatMergeFlag && !privTalkFlag) {
    const img = document.createElement('img');
    img.classList.add('chat-image');
    img.src = imageUrl;
    return img;
  }
  return null;
}

function createCssList(selectors) {
  const styleSheetObject = {};

  for (let i = 0; i < document.styleSheets.length; i++) {
    const styleSheet = document.styleSheets[i];
    for (let j = 0; j < styleSheet.cssRules.length; j++) {
      const rule = styleSheet.cssRules[j];
      if (rule.type === CSSRule.STYLE_RULE) {
        const selectorText = rule.selectorText;
        const styleText = rule.style.cssText;
        styleSheetObject[selectorText] = styleText;
      }
    }
  }
  const matchingStyles = [];
  function getCssBySelector(partialSelector) {
    for (const selector in styleSheetObject) {
      if (selector.includes(partialSelector)) {
        matchingStyles.push({ key: selector, value: styleSheetObject[selector] });
      }
    }
  }

  for(const selector of selectors){
    getCssBySelector(selector)
  }

  let cssRuleString = '';
  for(const user of game.users){
    cssRuleString += ` div.chat-box.user-${user._id} {background-color: ${hexToRgba(user.color, 0.3)};} \n`
  }

  for(const style of matchingStyles){
    cssRuleString += `${style.key} {${style.value}} \n`;
  }
  return cssRuleString;
}


function getSelectors(document) {
  const selectorsSet = new Set();

  function traverse(node) {
    if (node.nodeType === 1) {
      if (node.id)
        selectorsSet.add(`#${node.id}`);
      if (node.classList.length > 0) {
        node.classList.forEach(className => {
          selectorsSet.add(`.${className}`);
        });
      }
      for (let i = 0; i < node.attributes.length; i++) {
        const attr = node.attributes[i];
        if (attr.name !== 'id' && attr.name !== 'class') {
          selectorsSet.add(`[${attr.name}="${attr.value}"]`);
        }
      }
      for (let i = 0; i < node.childNodes.length; i++) {
        traverse(node.childNodes[i]);
      }
    }
  }

  traverse(document.body);
  return [...selectorsSet];
}

function getRollResultContent(chat){
  const rolls = typeof chat.rolls[0] === 'string' ? JSON.parse(chat.rolls[0]) : chat.rolls[0] ;
  const dieResults = rolls.terms.filter(term => term.results);
  const flavor = chat.flavor;
  let content= `<div class="roll-dice">
              <div class="flavor">${flavor}</div>
              <strong>${rolls.formula}</strong>: (`;
  for(const die of dieResults){
    for (const results of die.results) {
      content += `[${results.result}] `;
    }
  }

  content += `) => <strong>${rolls.total}</strong></div>`
  return content;
}


function hexToRgba(hex, opacity) {
  hex = hex.replace(/^#/, '');

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  opacity = Math.min(Math.max(opacity, 0), 1);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

async function zipInsideFolder(zip, imgSet, folderName) {
  let imgFolder = zip.folder(folderName);

  for (let url of imgSet) {
    try{
      let response = await fetch(url);
      let blob = await response.blob();
      let imageName = url.split('/').pop();
      imgFolder.file(cleanImageFilename(imageName), blob);
    } catch (e) {
      console.error(`Failed to fetch or process the image from URL: ${url}. Error: ${e.message} `);
    }
  }
}

function updateImageSources(document) {
  let images = document.querySelectorAll('.chat-text img');
  images.forEach(img => {
    let parts = img.getAttribute('src').split('/');
    let filename = parts[parts.length - 1];
    img.src = 'images/' + cleanImageFilename(filename);
  });
  let portraits = document.querySelectorAll('img.chat-image');
  portraits.forEach(img => {
    let parts = img.getAttribute('src').split('/');
    let filename = parts[parts.length - 1];
    img.src = 'portraits/' + cleanImageFilename(filename);
  });
}
function cleanImageFilename(filename) {
  const extensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg', '.tiff', '.tif', '.ico'];
  for (let ext of extensions) {
    if (filename.includes(ext)) {
      return filename.split(ext)[0] + ext;
    }
  }
  return filename;
}

class DownloadChatArchive extends FormApplication {
  constructor() {
    super();
    return new Dialog({
      //title: game.i18n.localize(`${CONSTANTS.MODULE_NAME}.dialogs.resetsettings.title`),
      title: `채팅 로그 다운로드`,
      content:
          `채팅 로그를 다운로드 합니다.`,
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: `다운로드`,
          callback: async () => {
            const chats = [...(ui.chat.collection.values())];
            await downloadArchiveFile(chats);
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: `취소`,
        },
      },
      default: "cancel",
    });
  }
  getData() {
  }
  async _updateObject(event, formData) {
  }
}

async function getDFchatArchive(filepath) {
  try {
    const response = await fetch(filepath);
    if (response.ok) {
      const data = await response.json();
      await downloadArchiveFile(data);
    } else {
      throw new Error('Could not access the archive from server side: ' + filepath);
    }
  } catch (error) {
    console.error(`Failed to read JSON for archive ${filepath}\n${error}`);
    throw error;
  } finally {
   game.settings.set("sch-customize", "convertDFchatArchive", "");
  }
}