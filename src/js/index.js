import { createDpopHeader, generateDpopKeyPair, buildAuthenticatedFetch } from '@inrupt/solid-client-authn-core';
import {
  getContainedResourceUrlAll,
  saveFileInContainer,
  getSolidDataset,
  getFile,
  getContentType
} from "@inrupt/solid-client";
import fetch from 'node-fetch';
import bootstrap from 'bootstrap/dist/js/bootstrap.bundle'
import * as bootstrap from 'bootstrap'

var accessToken;
var patientList = [];
var selectPatient;
var selectedPatient;

function fnInit(){
    var list = JSON.parse(localStorage.getItem("patientList"));
    selectPatient = document.getElementById("selectPatient");
    
    if(list){
        patientList = list;
    }
    
    patientList.forEach((e) => {
        var option = document.createElement("option");
        option.value = e.id;
        option.label = `${e.name}[${e.id}]`;
        selectPatient.appendChild(option);
    });
}
fnInit();

//id, secret 발급
async function getIdSecret(){
  const email = document.getElementById("inputEmail").value;
  const password = document.getElementById("inputPassword").value;

    const response = await fetch('http://localhost:3000/idp/credentials/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: email, password: password, name: 'hosipital' }),
    });
    if(response.status === 200){
      await response.json().then(({id, secret}) => {
        document.getElementById("inputId").value = id;
        document.getElementById("inputSecret").value = secret;
        document.getElementById("resultOfId").innerHTML = `<br><br><b>id</b>: <input style="border:0px; width:100%;" value="${id}"><br><b>secret</b>: <textarea style="border:0px; width:100%;" row="5">${secret}</textarea>`;
      });
    }else{
      await response.json().then(error => {
        document.getElementById("resultOfId").innerHTML = `<span class='text-danger'>${error.message}</span>`
      })
      
    }
} 

//id, secret으로 Access Token 발급
async function authorize(){
  const id = document.getElementById("inputId").value;
  const secret = document.getElementById("inputSecret").value;
  console.log(id);
  dpopKey = await generateDpopKeyPair();
  authString = `${encodeURIComponent(id)}:${encodeURIComponent(secret)}`;
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
   await responseToken.json().then(({access_token}) => {
    console.log(access_token);
    accessToken = access_token;
    document.getElementById("resultOfToken").innerHTML="토큰이 발급되었습니다."
   });

   authFetch = await buildAuthenticatedFetch(fetch, accessToken, { dpopKey });
   await getHospitalProfile();
  //  const modal = new bootstrap.Modal(document.getElementById("registModal"));
  //  modal.hide();
}

async function getHospitalProfile(){
  var base64Payload = accessToken.split('.')[1]; //value 0 -> header, 1 -> payload, 2 -> VERIFY SIGNATURE
  var payload = Buffer.from(base64Payload, 'base64'); 
  var result = JSON.parse(payload.toString())
  const webId = result.webid;
  document.getElementById("hospitalId").innerText = webId;
}
async function uploadFile(){
  const file = document.getElementById("formFile").files[0];
  try{
    await saveFileInContainer(  
      selectedPatient.podUrl+'hospital/',                             
      file,                                       // File
      { contentType: file.type, fetch: authFetch, slug: encodeURI(file.name) }   
    ).then(res => {
     alert(' 파일 업로드 완료.');
     getPatientFileList();
    })
  }catch(error){
    const errCode = error.statusCode;
    console.log('error: '+error);

   if(errCode == 403) {
     document.getElementById("errorMessage").innerHTML="<h6><b>접근 권한이 없습니다.</b></h6>";
   }else if(errCode == 404){
    document.getElementById("errorMessage").innerHTML="<h6>해당 리소스가 존재하지 않습니다.</h6>";
   }
  }

}

function addPatient(){
  var newPatient = {
    id: document.getElementById("inputPatientId").value,
    name: document.getElementById("inputPatientName").value,
    podUrl: document.getElementById("inputClientPodUrl").value
  };
  patientList.push(newPatient);
  localStorage.setItem("patientList", JSON.stringify(patientList));

const option = document.createElement("option");
option.value = newPatient.id;
option.label= newPatient.name;
selectPatient.appendChild(option);
}

async function getPatientFileList(){
  try{
    const container = await getSolidDataset(selectedPatient.podUrl+'hospital/', {fetch: authFetch});
  const fileList = getContainedResourceUrlAll(container);
  const ulFileList = document.getElementById("fileList");
  ulFileList.innerHTML=""; //초기화 하고 시작
  fileList.forEach(e => {
    const arSplitUrl = e.split("/");
    const fileName = decodeURI(arSplitUrl[arSplitUrl.length-1]); //파일 이름만 추출
    downloadFile(e).then(fileUrl => {
    console.log(fileUrl);
    var liTag = document.createElement("li");
    var aTag = document.createElement("a");
  
    aTag.innerText = fileName;
    aTag.href= fileUrl;
    aTag.download = fileName;

    liTag.appendChild(aTag);
    ulFileList.appendChild(liTag);
    }); })
  }catch(error){
    document.getElementById("fileList").innerHTML = `<span style='color:red; text-align:center'><b>접근 권한이 없습니다.<b></span>`;
  }

}

async function downloadFile(url){
  const file = await getFile(url, { fetch: authFetch });
  const fileUrl = window.URL.createObjectURL(file);
  return fileUrl;
}

document.getElementById("btnGetIdSecret").onclick = function(){
  getIdSecret();
}

document.getElementById("btnRegist").onclick = function(){
  authorize();
}

document.getElementById("btnRegistPatient").onclick = function(){
  addPatient();  
}

document.getElementById("btnUploadFile").onclick = function (){
  uploadFile();
}

document.getElementById("selectPatient").onchange = function(event){
  console.log(event.target.value);
  const id = event.target.value;
  selectedPatient = patientList.find(e => e.id == id);
  console.log(selectedPatient);
  document.getElementById("errorMessage").innerHTML="";

  getPatientFileList();
}
