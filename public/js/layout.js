import { getUser } from "./api.js";
import { Template } from "./components/Template.js";
import { Leftbar } from "./components/Leftbar.js";
import { Rightbar } from "./components/Rightbar.js";
import { appState } from "./state.js";

export async function layout() {
    const rootDiv = document.getElementById("root")
    rootDiv.innerHTML = Template();
    try {
        let user = await getUser();
        appState.user = user;
        const leftsideHtml = Leftbar(user)
        document.getElementById("leftSidebar").innerHTML = leftsideHtml
        document.getElementById("leftOffcanvasBody").innerHTML = leftsideHtml
    }catch(err){
        console.log(err.message)
    }
    const rightsideHtml = Rightbar()
    document.getElementById("rightSidebar").innerHTML = rightsideHtml
    document.getElementById("rightOffcanvasBody").innerHTML = rightsideHtml
}