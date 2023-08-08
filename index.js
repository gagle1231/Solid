// browser를 사용한 client app
import {
   login,
   handleIncomingRedirect,
   logout,
   getDefaultSession,
 } from "@inrupt/solid-client-authn-browser";

 import { createDpopHeader, generateDpopKeyPair, buildAuthenticatedFetch } from '@inrupt/solid-client-authn-core';
 import {
   addUrl,
   addStringNoLocale,
   createSolidDataset,
   createThing,
   getPodUrlAll,
   getSolidDataset,
   getThingAll,
   getThing,
   getStringNoLocale,
   removeThing,
   saveSolidDatasetAt,
   setThing,
   setStringNoLocale,
   universalAccess, //권한 부여
 } from "@inrupt/solid-client";
 import fetch from 'node-fetch';

 import { SCHEMA_INRUPT, RDF, AS, VCARD } from "@inrupt/vocab-common-rdf";
 import { solid } from "@inrupt/solid-client/dist/constants";
 import {getProfileJwksIri} from "@inrupt/solid-client";

 const selectorIdP = document.querySelector("#select-idp");
 const selectorPod = document.querySelector("#select-pod");
 const buttonLogin = document.querySelector("#btnLogin");
 const buttonCreate = document.querySelector("#btnSend");
 const labelCreateStatus = document.querySelector("#labelCreateStatus");
 const buttonViewor = document.querySelector("#btnViewor");  // 권한 부여를 위해 추가 
 const selectorPod3 = document.querySelector("#select-pod3");  // 권한 부여를 위해 추가
 const writeForm = document.getElementById("writeForm");
 const readForm = document.getElementById("readForm");
 const fileForm = document.getElementById("fileForm");
 const tokenForm  = document.getElementById("tokenForm");
 const txtReadData = document.getElementById("readData");
 //버튼 비활성화 상태로 (조건 미충족 시 비활성화)
 //buttonCreate.setAttribute("disabled", "disabled");
 //fileCreate.setAttribute("disabled", "disabled");
 buttonViewor.setAttribute("disabled", "disabled"); // 권한 부여를 위해 추가

 // 1a. Start Login Process. Call login() function.
function loginToSelectedIdP() {
   const SELECTED_IDP = document.getElementById("select-idp").value;
   return login({
     oidcIssuer: SELECTED_IDP,
     redirectUrl: "http://localhost:1234/",
     clientName: "Solid demo app"
   });
}
// Login Redirect. Call handleIncomingRedirect() function.
 // When redirected after login, finish the process by retrieving session information.
 async function handleRedirectAfterLogin() {
  await handleIncomingRedirect().then((data) => {
    document.getElementById("myWebID").removeAttribute("disabled");
    document.getElementById("myWebID").value = data.webId;
    document.getElementById("btnReadPod").removeAttribute("disabled");
    var webId = data.webId;
    //pod url 형식은 http://localhost:3000/user/
    document.getElementById("podName").value = webId?.replace("profile/card#me", '');
    
  });
  dpopKey = await generateDpopKeyPair();
}
handleRedirectAfterLogin();
let dpopKey

 // Make new file
 async function writeFile() {
  dpopKey = await generateDpopKeyPair();
   const access_token = document.getElementById("token").value;
   const title = document.getElementById("file_name").value;
   const newData = (document.getElementById("newData").value).toString();
   const podUrl = document.getElementById("podName").value;
   const response2 = await fetch(podUrl, {
    method: 'POST',
    headers: {
      authorization: `DPop ${access_token}`,
      'content-type': 'application/x-www-form-urlencoded',
      dpop: await createDpopHeader(podUrl, 'POST', dpopKey),
      Slug : title
    },
    body: {
      newData
    },
  });
 }


 // location 경로 출력
 async function copyLocation() {
   const SELECTED_POD = document.getElementById("select-pod").value;
   const title = document.getElementById("file_name").value;

   document.getElementById(
     "labelLink"
   ).textContent = `${SELECTED_POD}getting-started/readingList/${title}`;
   // 지금은 getting-started/readingList/ 라고 경로를 지정해주었고, 디렉토리명 입력받으면 이 부분 수정
 }

 // 4. Grant Permission
 selectorPod3.addEventListener("change", pod3SelectionHandler);
 function pod3SelectionHandler() {
   if (selectorPod3.value === "") {
     buttonViewor.setAttribute("disabled", "disabled");
   } else {
     buttonViewor.removeAttribute("disabled");
   }
 }

 // Grant Edit Permission 버튼 클릭 시 호출
 async function editPermission() {
   const SELECTED_POD = document.getElementById("select-pod3").value;
   const path = document.getElementById("input_permission_path").value;
   const grantFileUrl = `${SELECTED_POD}` + path;  // 권한 부여하고 싶은 파일 경로
   const inputWebID = document.getElementById("grant_webID").value;  // 권한 부여하고 싶은 WebID

   console.log("path : " + grantFileUrl);
   console.log("webid : " + inputWebID);

   // 액세스 권한 부여 검색을 위해 추가
   // 자원 소유자가 Access Request 요청을 허용 및 거부할 때
   // 승인/거부된 Access Grant의 ID(VC로 직렬화)가 요청하는 앱으로 쿼리 매개변수로 전송
   // 요청하는 앱은 아래 메소드로 Access Grant를 가져올 수 있음.
   const session = getDefaultSession();
   const webID = session.info.webId;

   // Change Agent Access
   // Resource에 대한 Agent의 액세스 권한 설정
   universalAccess.setAgentAccess(
     grantFileUrl,         // Resource
     inputWebID,     // Agent
     { read: true, write: false, },          // Access object
     { fetch: fetch }                         // fetch function from authenticated session
   ).then((newAccess) => {
     logAccessInfo(inputWebID, newAccess, grantFileUrl)
   });
   
   console.log("View 권한 부여 성공");
   
   function logAccessInfo(agent, agentAccess, resource) {
     console.log(`For resource::: ${resource}`);
     if (agentAccess === null) {
       console.log(`Could not load ${agent}'s access details.`);
     } else {
       console.log(`${agent}'s Access:: ${JSON.stringify(agentAccess)}`);
     }
   }
 }

 // 권한 location 복사용
 async function copyLocation2() {
   const SELECTED_POD = document.getElementById("select-pod3").value;
   const url = document.getElementById("input_permission_path").value;

   document.getElementById(
     "labelLink2"
   ).textContent = `${SELECTED_POD}${url}`;
 }

 // 5. Write to profile
 async function writeProfile() {
  
   const name = document.getElementById("input_name").value;
   const session = getDefaultSession();

   if (!session.info.isLoggedIn) {
     // You must be authenticated to write.
     document.getElementById(
       "labelWriteStatus"
     ).textContent = `...you can't write [${name}] until you first login!`;
     document.getElementById("labelWriteStatus").setAttribute("role", "alert");
     // 해당 요소를 사용자에게 알리는 중요한 정보로 인식 가능
     return;
   }
   const webID = session.info.webId;
   // The WebID can contain a hash fragment (e.g. `#me`) to refer to profile data
   // in the profile dataset. If we strip the hash, we get the URL of the full
   // dataset.
   const mypods = await getPodUrlAll(webID, { fetch: fetch });
   const profileDocumentUrl = new URL(mypods + "profile");
   profileDocumentUrl.hash = "";
 
   // To write to a profile, you must be authenticated. That is the role of the fetch
   // parameter in the following call.
   let myProfileDataset = await getSolidDataset(profileDocumentUrl.href, {
     fetch: session.fetch
   });
 
   // The profile data is a "Thing" in the profile dataset.
   let profile = getThing(myProfileDataset, webID);
 
   // Using the name provided in text field, update the name in your profile.
   // VCARD.fn object is a convenience object that includes the identifier string "http://www.w3.org/2006/vcard/ns#fn".
   // As an alternative, you can pass in the "http://www.w3.org/2006/vcard/ns#fn" string instead of VCARD.fn.
   profile = setStringNoLocale(profile, VCARD.fn, name);
 
   // Write back the profile to the dataset.
   myProfileDataset = setThing(myProfileDataset, profile);
 
   // Write back the dataset to your Pod.
   await saveSolidDatasetAt(profileDocumentUrl.href, myProfileDataset, {
     fetch: session.fetch
   });
 
   // Update the page with the retrieved values.
   document.getElementById(
     "labelWriteStatus"
   ).textContent = `Wrote [${name}] as name successfully!`;
   document.getElementById("labelWriteStatus").setAttribute("role", "alert");
   document.getElementById(
     "labelFN"
   ).textContent = `...click the 'Read Profile' button to to see what the name might be now...?!`;
 }

 async function readData(){
  const access_token = document.getElementById("token").value;
  const authFetch = await buildAuthenticatedFetch(fetch, access_token, { dpopKey });
  const podUrl = document.getElementById("podUrl").value;
  let reader
  const fetchData = await authFetch(podUrl).then(res => {
  reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  });
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      console.log('The stream is done.');
      break;
    }
    console.log(value);
    txtReadData.textContent = value;
  }
}
 
 buttonLogin.onclick = function () {
   loginToSelectedIdP();
 };

 fileForm.addEventListener("submit", (event) => {
   event.preventDefault();
   writeFile();
 });

 buttonViewor.onclick = function() {
   editPermission();
   copyLocation2();
 };

 writeForm.addEventListener("submit", (event) => {
   event.preventDefault();
   writeProfile();
 });

 readForm.addEventListener("submit", (event) => {
   event.preventDefault();
   readData();
 });
 
 tokenForm.addEventListener("submit", (event) => {
  event.preventDefault();
  getToken();
 })

 // 이벤트가 발생하면 idpSelectionHandler 함수 호출
 // 미로그인 시 버튼 비활성화, 로그인 시 활성화
 selectorIdP.addEventListener("change", idpSelectionHandler);
 function idpSelectionHandler() {
   if (selectorIdP.value === "") {
     buttonLogin.setAttribute("disabled", "disabled");
   } else {
     buttonLogin.removeAttribute("disabled");
   }
 }
 