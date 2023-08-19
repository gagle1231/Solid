// browser를 사용한 client app
import { createDpopHeader, generateDpopKeyPair, buildAuthenticatedFetch } from '@inrupt/solid-client-authn-core';
import {
  createSolidDataset,
  createContainerAt,
  getFile,
  getSourceUrl,
  overwriteFile,
  getResourceInfo,
  getContentType
} from "@inrupt/solid-client";
import fetch from 'node-fetch';
import { RdfaParser } from "rdfa-streaming-parser";

const btnGetToken = document.getElementById("getToken");
const myWebID = document.getElementById("myWebID");
const myPodUrl = document.getElementById("myPodUrl");
const readDataForm = document.getElementById("readForm")
const fileForm = document.getElementById("fileForm");

let dpopKey;
async function getAccessToken(){
const id = document.getElementById("id").value;
const secret = document.getElementById("secret").value;
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

  try {
  if(srcType == "file"){
   const file = new File([newData], title, {
     type: "text/plain",
   });
   
   const savedFile = await overwriteFile(  
     `${podUrl}${title}.txt`,                             
     file,                                       // File
     { contentType: file.type, fetch: authFetch }   
   ).then(res => {
    alert('텍스트 파일이 생성되었습니다.');
   });
  }else{
    const container = await createContainerAt(`${podUrl}${title}`, {fetch: authFetch});
  }
}catch(error){
  alert('파일 쓰기에 실패했습니다.');
}
}

const getRdfaParser = (source, resourceInfo) => {
  const onQuadCallbacks = [];
  const onCompleteCallbacks = [];
  const onErrorCallbacks = [];

  return {
    onQuad: (callback) => onQuadCallbacks.push(callback),
    onError: (callback) => onErrorCallbacks.push(callback),
    onComplete: (callback) => onCompleteCallbacks.push(callback),
    parse: async (source, resourceInfo) => {
      const parser = new RdfaParser({
        baseIRI: getSourceUrl(resourceInfo),
        contentType: "text/turtle",
      });
      parser.on("data", (quad) => {
        onQuadCallbacks.forEach((callback) => callback(quad));
      });
      parser.on("error", (error) => {
        onErrorCallbacks.forEach((callback) => callback(error));
      });

      parser.write(source);
      parser.end();
      onCompleteCallbacks.forEach((callback) => callback());
    },
  };
};

readDataForm.addEventListener("submit", (event) => {
 event.preventDefault();
 readData();
});

fileForm.addEventListener("submit", (event) => {
 event.preventDefault();
 writeFile();
});

btnGetToken.onclick = function(){
 getAccessToken();
}
