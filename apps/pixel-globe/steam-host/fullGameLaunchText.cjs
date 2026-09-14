// Native startup prompt, before the renderer and its localization are loaded.
const TEXT = Object.freeze({
  english: ["You own the full game. Would you like to switch?", "Your full-game voyage is safe. The demo uses a separate voyage.", "Play full game", "Install full game", "Play demo", "Could not open Steam. Please open the full game from your Steam library."],
  schinese: ["您已拥有完整版。要切换吗？", "您的完整版航程会保留。试玩版使用独立存档。", "开始完整版", "安装完整版", "开始试玩版", "无法打开 Steam。请从 Steam 库中打开完整版。"],
  tchinese: ["您已擁有完整版。要切換嗎？", "您的完整版航程會保留。試玩版使用獨立存檔。", "開始完整版", "安裝完整版", "開始試玩版", "無法開啟 Steam。請從 Steam 收藏庫開啟完整版。"],
  japanese: ["製品版をお持ちです。切り替えますか？", "製品版の航海は保護されます。体験版は別のセーブを使用します。", "製品版をプレイ", "製品版をインストール", "体験版をプレイ", "Steamを開けませんでした。Steamライブラリから製品版を起動してください。"],
  spanish: ["Ya tienes el juego completo. ¿Quieres cambiar?", "Tu partida del juego completo está a salvo. La demo usa otra partida.", "Jugar al juego completo", "Instalar el juego completo", "Jugar a la demo", "No se pudo abrir Steam. Abre el juego completo desde tu biblioteca de Steam."],
  french: ["Vous possédez le jeu complet. Voulez-vous le lancer ?", "Votre partie complète est préservée. La démo utilise une partie distincte.", "Jouer au jeu complet", "Installer le jeu complet", "Jouer à la démo", "Impossible d'ouvrir Steam. Lancez le jeu complet depuis votre bibliothèque Steam."],
  german: ["Du besitzt die Vollversion. Möchtest du wechseln?", "Dein Spielstand der Vollversion bleibt erhalten. Die Demo nutzt einen eigenen Spielstand.", "Vollversion spielen", "Vollversion installieren", "Demo spielen", "Steam konnte nicht geöffnet werden. Starte die Vollversion über deine Steam-Bibliothek."],
  polish: ["Masz pełną wersję gry. Chcesz ją uruchomić?", "Zapis pełnej wersji jest bezpieczny. Demo używa osobnego zapisu.", "Graj w pełną wersję", "Zainstaluj pełną wersję", "Graj w demo", "Nie udało się otworzyć Steam. Uruchom pełną wersję z biblioteki Steam."],
  russian: ["У вас есть полная версия. Хотите перейти в неё?", "Сохранение полной версии в безопасности. Демо использует отдельное сохранение.", "Играть в полную версию", "Установить полную версию", "Играть в демо", "Не удалось открыть Steam. Запустите полную версию из библиотеки Steam."],
  brazilian: ["Você tem o jogo completo. Deseja mudar?", "Sua viagem no jogo completo está segura. A demo usa uma viagem separada.", "Jogar o jogo completo", "Instalar o jogo completo", "Jogar a demo", "Não foi possível abrir o Steam. Abra o jogo completo pela sua biblioteca Steam."],
  koreana: ["정식 버전을 보유하고 있습니다. 전환하시겠습니까?", "정식 버전의 항해는 안전하게 보존됩니다. 체험판은 별도의 저장을 사용합니다.", "정식 버전 플레이", "정식 버전 설치", "체험판 플레이", "Steam을 열 수 없습니다. Steam 라이브러리에서 정식 버전을 실행하세요."]
});
function fullGameLaunchText(language) {
  const [message, detail, play, install, demo, error] = TEXT[language] || TEXT.english;
  return { message, detail, play, install, demo, error };
}
module.exports = { fullGameLaunchText };
