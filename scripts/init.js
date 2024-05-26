let lastPrivTalkMsg;
let privTalkIndex = 0;

Hooks.once("setup", function () {
  const commands = game.chatCommands;

  lastPrivTalkMsg = null;
  privTalkIndex = 0;
  commands.register({
    name: "/pt",
    module: "core",
    aliases: [`${game.settings.get('sch-customize', 'customPrivTalkAlias')}`,"`", "!"],
    icon: "<i class='fas fa-dice-d20'></i>",
    requiredRole: "NONE",
    callback: async function (chat, parameters, messageData){
      if (!game.settings.get("sch-customize", "markdownDelUse"))
        parameters = parameters.replace(/<\s*\/?\s*del\s*>/g, '~');

      const speakUser = (messageData.user instanceof User ? messageData.user : game.users.get(messageData.user));
      messageData.speaker.actor = speakUser.id;
      messageData.speaker.token = null;
      messageData.speaker.alias = speakUser.name;
      messageData.type = game.settings.get("sch-customize", "privTalkAsOOC") ? CONST.CHAT_MESSAGE_TYPES.OOC : CONST.CHAT_MESSAGE_TYPES.OTHER;

      return {
        content: parameters,
        flags: {
          'sch-customize':
              {'priv_talk': true}
        }
      }
    },
    autocompleteCallback: (menu, alias, parameters) => [game.chatCommands.createInfoElement("잡담")],
    closeOnComplete: true
  });
});


Hooks.on("renderChatMessage", (message, html, messageData) => {
  const privFlag = message.flags.priv_talk || message.getFlag('sch-customize', 'priv_talk');
  if (privFlag) {
    html.addClass('priv_talk');
    html.addClass(`user-${message.user.id}`);
    if(privTalkIndex > 0){
      if(lastPrivTalkMsg) {
        const prevHtml = lastPrivTalkMsg;
        if (prevHtml.hasClass('end')){
          prevHtml.removeClass('end');
          prevHtml.addClass('middle');
          html.addClass('end');
        } else{
          prevHtml.addClass('top');
          html.addClass('end');
        }
      }
    }
    privTalkIndex++;
    lastPrivTalkMsg = html;
    html.find('header').css("display", "none");
    html.find('.message-content').html(`<div class="pt priv_user">${message.speaker.alias}</div> <div class="pt">${message.content}</div>`);
    if (!game.settings.get("sch-customize", "privTalkSpeakerLineChange"))
      html.addClass('line-change');
  }
  else{
    privTalkIndex = 0;
  }
});


Hooks.once('init', () => {

  game.settings.registerMenu("sch-customize", "downloadChatArchiveMenu", {
    name: `채팅 로그 다운로드`,
    hint: `html형식의 채팅 로그와 이미지 파일을 다운로드 합니다.`,
    icon: "fas fa-download",
    type: DownloadChatArchive
  });

  game.settings.registerMenu("sch-customize", "openChatArchiveWindow", {
    name: `채팅 로그 표시`,
    hint: `현재까지의 채팅 로그를 새 창에 표시합니다.`,
    icon: "fas fa-arrow-up-right-from-square",
    type: openChatArchiveWindow
  });
  game.settings.register("sch-customize", "includeWhisper", {
    name: "채팅 로그 귓속말을 포함",
    hint: "채팅 로그에 귓속말을 포함합니다.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
  });

  game.settings.register("sch-customize", "hideWhisper", {
    name: "채팅 로그 귓속말 숨김",
    hint: "채팅 로그의 귓속말을 가립니다. 회색 배경으로 표시되며 클릭 시 텍스트가 표시됩니다.",
    scope: "client",
    config: true,
    default: false,
    type: Boolean,
  });

  game.settings.register("sch-customize", "convertDFchatArchive", {
    name: "DF Chat Archive 변환",
    restricted: true,
    config: true,
    type: String,
    filePicker: "any",
    default: "",
    onChange: value => {
      if (value.endsWith(".json"))
        getDFchatArchive(value);
      else if (value.length > 0)
        alert("json 파일을 선택해 주세요.")
    }
  });

  game.settings.register("sch-customize", "customPrivTalkAlias", {
    name: "잡담 시작을 위한 문자 지정",
    hint: "잡담으로 발언할 때 처음으로 타이핑 하는 커스텀 문자를 등록합니다. 입력한 문자는 다른 모듈과 중복, 마크다운 옵션 등의 이유로 사용이 불가능 할 수 있습니다. 기본 옵션인 '/pt', '!', '`'는 유지됩니다.",
    scope: "client",
    config: true,
    default: "/p",
    type: String,
    onChange: _ => window.location.reload()
  });


  game.settings.register("sch-customize", "markdownDelUse", {
    name: "잡담에 마크다운 취소선 적용 여부",
    hint: "채팅에 마크다운을 적용 시, 잡담 중 ~로 감싸인 문자를 취소선으로 표시합니다.",
    scope: "client",
    config: true,
    default: false,
    type: Boolean,
    onChange: _ => window.location.reload()
  });

  game.settings.register("sch-customize", "privTalkAsOOC", {
    name: "잡담을 OOC로 생성",
    hint: "이후 생성되는 잡담은 OOC로 분류됩니다. 기본은 기타(Other)입니다.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });

  game.settings.register("sch-customize", "privTalkSpeakerLineChange", {
    name: "잡담 이름 표기 후 줄바꿈",
    hint: "잡담에서 플레이어 닉네임 표시 후 줄바꿈하고 메세지 내용을 표시합니다.",
    scope: "client",
    config: true,
    default: false,
    type: Boolean,
    onChange: _ => window.location.reload()
  });

  game.settings.register("sch-customize", "setChatLogFontSize", {
    name: '기본 채팅 글자 크기',
    hint: '기본 채팅 글자 크기 조절(기본 14px)',
    config: true,
    type: Number,
    scope: 'client',
    range: {
      min: 14,
      max: 30,
      step: 0.5
    },
    default: 14,
    onChange: (value) => this.updateCssProperty('clFontSize', `${value}px`)
  });


  game.settings.register("sch-customize", "setPrivTalkFontSize", {
    name: '잡담 글자 크기',
    hint: '잡담 글자 크기를 조절합니다.(기본 12px)',
    config: true,
    type: Number,
    scope: 'client',
    range: {
      min: 10,
      max: 30,
      step: 0.5
    },
    default: 12,
    onChange: (value) => this.updateCssProperty('ptFontSize', `${value}px`)
  });

  game.settings.register("sch-customize", "setPrivTalkFontOpacity", {
    name: '잡담 글자 색상',
    hint: '잡담 글자 색상인 검정색의 진하기를 조절합니다.(기본 0.8)',
    config: true,
    type: Number,
    scope: 'client',
    range: {
      min: 0,
      max: 1,
      step: 0.05
    },
    default: 0.8,
    onChange: (value) => this.updateCssProperty('fontColor', `rgba(0,0,0,${value})`)
  });

  game.settings.register("sch-customize", "setPrivTalkMarginLeft", {
    name: '잡담 여백 간격',
    hint: '잡담 왼쪽으로 생기는 여백 간격을 조절합니다.(기본 10)',
    config: true,
    type: Number,
    scope: 'client',
    range: {
      min: 0,
      max: 40,
      step: 1
    },
    default: 10,
    onChange: (value) => this.updateCssProperty('marginLeft', `${value}px`)
  });

  game.settings.register("sch-customize", "setPrivTalkBgBrightness", {
    name: '잡담 밝기 조절',
    hint: '잡담 배경색(유저 색상과 동일)을 밝게 표시합니다. 채팅의 배경색을 지정하는 다른 모듈의 옵션을 적용할 경우 알맞게 조절이 필요합니다.(기본 0.7)',
    config: true,
    type: Number,
    scope: 'client',
    range: {
      min: 0,
      max: 1,
      step: 0.05
    },
    default: 0.7,
    onChange: (value) => this.updateCssProperty('brightness', `${value}`)
  });


  this.updateCssProperty('fontColor', `rgba(0,0,0,${(game.settings.get("sch-customize", "setPrivTalkFontOpacity"))})` );
  this.updateCssProperty('clFontSize',`${game.settings.get("sch-customize", "setChatLogFontSize")}px`);
  this.updateCssProperty('ptFontSize',`${game.settings.get("sch-customize", "setPrivTalkFontSize")}px`);
  this.updateCssProperty('marginLeft',`${game.settings.get("sch-customize", "setPrivTalkMarginLeft")}px`);
  this.updateCssProperty('brightness',`${game.settings.get("sch-customize", "setPrivTalkBgBrightness")}`);
});

Hooks.once('ready', () => this.setUserColorBg());

const cssProperty = {
  ptFontSize : '--priv-talk-font-size',
  fontColor : '--priv-talk-font-color',
  marginLeft : '--priv-talk-margin-left',
  brightness : '--priv-talk-bg-brightness',
  clFontSize : '--sch-cus-chat-font-size'
}


function updateCssProperty(property,value){
  if(value)
    document.querySelector(':root').style.setProperty(cssProperty[property], value);
}


function setUserColorBg(){
  const style = document.createElement('style');
  style.type = 'text/css';
  let cssText = '';

  game.users.forEach(user => {
    cssText += `.user-${user.id} { background: ${user.color}; }`
  });

  if (style.styleSheet) {
    style.styleSheet.cssText = cssText;
  } else {
    style.appendChild(document.createTextNode(cssText));
  }
  document.head.appendChild(style);
}
