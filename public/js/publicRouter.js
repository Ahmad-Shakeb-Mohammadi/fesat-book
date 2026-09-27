import { renderHero } from "./views/hero.js"
import { renderLogin } from "./views/login.js"
import { renderSignup } from "./views/signup.js"

const publicRoutes = {
    "/hero"   : renderHero,
    "/login"  : renderLogin,
    "/signup" : renderSignup
}

export function publicRouter() {
    const path = window.location.pathname
    const page = publicRoutes[path]

    if (page) {
        page()
    } else {
        // unknown path + not logged in → go to hero
        history.replaceState(null, '', '/hero')
        renderHero()
    }
}