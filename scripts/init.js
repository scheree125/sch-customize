Hooks.once("setup", function () {
  const commands = game.chatCommands;
  Hooks.on("renderChatMessage", (message, html, messageData) => {
    if(message.flags.priv_talk){
      html.addClass('priv_talk');
      html.find('header').css("display","none");
      html.find('.message-content').prepend(`<div class="priv_user">${message.speaker.alias}</div> `);
      if (game.settings.get("sch-customize", "speaker-line-change"))
        html.addClass('line-change');
    }
  });
  commands.register({
    name: "/pt",
    module: "core",
    aliases: ["/p","`", "!"],
    icon: "<i class='fas fa-dice-d20'></i>",
    requiredRole: "NONE",
    callback: async function (chat, parameters, messageData){
      if(!game.actors.getName("잡담")){
        let actor = await Actor.create({
          name: "잡담",
          type: "character"
        });
      }
      messageData.speaker.actor = game.actors.getName("잡담").id;
      messageData.speaker.token = null;

      const speakUser = (messageData.user instanceof User ? messageData.user : game.users.get(messageData.user));
      messageData.speaker.alias = speakUser.name;
      return {
        content: parameters,
        // user: game.users.getName("잡담"),
        // flavor: speakUser.name,
        flags: {'priv_talk': true}
      }
    },
    autocompleteCallback: (menu, alias, parameters) => [game.chatCommands.createInfoElement("잡담")],
    closeOnComplete: true
  });
});

Hooks.once('init', () => {
  game.settings.register("sch-customize", "privTalkSpeakerLineChange", {
    name: "이름 뒤 줄바꿈",
    hint: "플레이어 닉네임 표시 후 줄바꿈 후 잡담 내용을 표시합니다.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    onChange: _ => window.location.reload()
  });

  game.settings.registerMenu("sch-customize", "downloadChatArchiveMenu", {
    name: `채팅 로그 다운로드`,
    hint: `html형식의 채팅 로그와 이미지 파일을 다운로드 합니다.`,
    icon: "fas fa-coins",
    type: DownloadChatArchive,
    restricted: true,
  });

  game.settings.register("sch-customize", "convertDFchatArchive", {
    name: "DF Chat Archive 변환",
    restricted: true,
    config: true,
    type: String,
    filePicker: "any",
    default: "",
    onChange: value => {
      if(value.endsWith(".json"))
        getDFchatArchive(value);
      else if(value.length > 0)
        alert("json 파일을 선택해 주세요.")
    }
  });
});
