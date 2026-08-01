export function hospitallerMaltaOfferText({ tripoliAvailable }) {
  return "Rhodes has fallen, but the Order's vows have not. His Holiness would have you carry " +
    "a petition to Charles, King of Spain and Emperor, that Malta be granted as a new seat" +
    (tripoliAvailable ? ", together with the charge of Tripoli" : "") + ".";
}

export function hospitallerMaltaAcceptanceText(grantorCapitalName) {
  return `Then sail with my nuncio to ${grantorCapitalName}. The petition bears the Fisherman's ` +
    "Ring; your presence will show that the Order yet lives.";
}

export function hospitallerMaltaGrantText({ tripoliIncluded }) {
  return "By royal and imperial grace, Malta is granted to the Order in perpetual fief" +
    (tripoliIncluded ? ", with the defence of Tripoli entrusted to it" : "") +
    ". Each year, on All Saints' Day, one falcon shall be rendered to the Viceroy of Sicily.";
}

export function hospitallerMaltaCaptainGrantText() {
  return "Rhodes is lost behind us. At Birgu we shall raise the eight-pointed cross again, and " +
    "make a fortress of our exile.";
}

export function hospitallerMaltaCompletionText() {
  return "The instruments are sealed. The Order has a sovereign seat once more, and Rome will " +
    "remember who carried its cause across the sea.";
}
