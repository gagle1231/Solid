// browser를 사용한 client app
 import { createDpopHeader, generateDpopKeyPair, buildAuthenticatedFetch } from '@inrupt/solid-client-authn-core';
 import {
   createSolidDataset,
   createContainerAt,
   saveFileInContainer,
   getSolidDataset,
   getUrlAll,
   getPodUrlAll,
   getFile,
   getSourceUrl,
   overwriteFile
 } from "@inrupt/solid-client";
 import fetch from 'node-fetch';

 const myWebID = document.getElementById("myWebID");
 const myPodUrl = document.getElementById("myPodUrl");
 const readDataForm = document.getElementById("readForm")
 const fileForm = document.getElementById("fileForm");

 let dpopKey;
 async function getAccessToken(){
 const id = "my-token_a60cb333-3240-431e-bd6f-92b6f5268d2c";
 const secret = "bf70d1b61525fe20bc1c47bea30addef768a4a10fde4696bed72ace838763cc210ac41a3e1beb5a2d7df4f4420a2b25fcf74474bc16d8e2d5405c8e0465f968c";
 const access_Token = document.getElementById("accessToken");

 //id와 secret으로 access token 발급
  dpopKey = await generateDpopKeyPair();
  const authString = `${encodeURIComponent(id)}:${encodeURIComponent(secret)}`;
  const tokenUrl = 'http://localhost:3000/.oidc/token';
  const responseToken = await fetch(tokenUrl, {
  method: 'POST',
  headers: {
    authorization: `Basic ${Buffer.from(authString).toString('base64')}`,
    'content-type': 'application/x-www-form-urlencoded',
    dpop: await createDpopHeader(tokenUrl, 'POST', dpopKey),
  },
  body: 'grant_type=client_credentials&scope=webid',
});
const { access_token: accessToken } = await responseToken.json();
access_Token.value = accessToken;

var base64Payload = accessToken.split('.')[1]; //value 0 -> header, 1 -> payload, 2 -> VERIFY SIGNATURE
var payload = Buffer.from(base64Payload, 'base64'); 
var result = JSON.parse(payload.toString())
console.log(result);

//token에서 Web ID 정보 빼오기
const webId = result.webid;
myWebID.value = webId;
myPodUrl.value = webId.replace("profile/card#me", "");
}
 getAccessToken();

 async function readData(){
  const accessToken = document.getElementById("accessToken").value;
  const readData = document.getElementById("readData");
  const authFetch = await buildAuthenticatedFetch(fetch, accessToken, { dpopKey });
  const podUrl = document.getElementById("podUrl").value;

  try {
    // file is a Blob (see https://developer.mozilla.org/docs/Web/API/Blob)
    const file = await getFile(
      podUrl,               // File in Pod to Read
      { fetch: authFetch }       // fetch from authenticated session
    );

    const reader = new FileReader();
    const text =  await file.text();
    console.log( `Fetched a file from ${getSourceUrl(file)}.`);
    readData.textContent = text;
  } catch (err) {
    const errCode = err.statusCode;
    //임시적으로 에러처리 해둠
    if(errCode == 403) {
      alert( errCode + ': 접근 권한이 없습니다.');
    }else if(errCode == 404){
      alert( errCode + ': 해당 리소스를 찾을 수 없습니다.');
    }
  }

}

async function writeFile() {
   const accessToken = document.getElementById("accessToken").value;
   const title = document.getElementById("file_name").value;
   const newData = (document.getElementById("newData").value).toString();
   const podUrl = document.getElementById("podName").value;
   const srcType = document.getElementById("resourceType").value;
   const authFetch = await buildAuthenticatedFetch(fetch, accessToken, { dpopKey });

   if(srcType == "file"){
    const file = new File([newData], title, {
      type: "text/plain",
    });
    
    const savedFile = await overwriteFile(  
      `${podUrl}/${title}.txt`,                             
      file,                                       // File
      { contentType: file.type, fetch: authFetch }   
    );
   }else{
    await createContainerAt(`${podUrl}/${title}`, {fetch: authFetch});
   }
 }

readDataForm.addEventListener("submit", (event) => {
  event.preventDefault();
  readData();
});

fileForm.addEventListener("submit", (event) => {
  event.preventDefault();
  writeFile();
})
 // Make new file
 /*

*/
 