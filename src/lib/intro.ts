export const INTRO_SESSION_KEY = "flixi-intro-seen";

/** Script exécuté avant l'affichage : masque l'intro si elle a déjà été vue (aucun flash). */
export const introBootScript = `try{if(sessionStorage.getItem("${INTRO_SESSION_KEY}")||matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.dataset.intro="skip"}}catch(e){}`;
