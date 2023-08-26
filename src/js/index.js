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
var selectedPatientList = [];

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

//일단은 병원 이름 상단 nav bar에 띄어주기 용도로 사용
async function getHospitalProfile(){
  //web id 가져오기
  var base64Payload = accessToken.split('.')[1]; //value 0 -> header, 1 -> payload, 2 -> VERIFY SIGNATURE
  var payload = Buffer.from(base64Payload, 'base64'); 
  var result = JSON.parse(payload.toString())
  const webId = result.webid;
  const hospitalId = webId.split("/")[3]; //추후 추출 방식 변경 
  document.getElementById("hospitalId").innerHTML = `<h4 class='mx-2'>${hospitalId}</h4>`;
}

async function uploadFile(){
  const file = document.getElementById("formFile").files[0];
  try{
    await saveFileInContainer(  
      selectedPatientList[0].podUrl+'public/',                             
      file,                                       // File
      { contentType: file.type, fetch: authFetch, slug: encodeURI(file.name) }   
    ).then(res => {
      document.getElementById("errorMessage").innerHTML="<h5 class='text-success mt-2'><b>파일 전달 성공</b></h5>";
    })
  }catch(error){
    const errCode = error.statusCode;
    console.log('error: '+error);

   if(errCode == 403) {
    document.getElementById("errorMessage").innerHTML="<h5 class='text-danger mt-2'><b>접근 권한이 없습니다.</b></h5>";
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

const getPatientFileList = async function(){
  const ulFileList = document.getElementById("fileList");
  ulFileList.innerHTML=""; //초기화 하고 시작

  selectedPatientList.forEach(async (patient) => {
    const container = await getSolidDataset(patient.podUrl+'hospital/', {fetch: authFetch}); //default: public 파일에 전달
    const fileList = getContainedResourceUrlAll(container); //컨테이너의 모든 리소스 url 조회
    fileList.forEach(e => { //각 리소스 url로 파일 가져오기
      const arSplitUrl = e.split("/");
      const fileName = decodeURI(arSplitUrl[arSplitUrl.length-1]); //파일 이름만 추출(화면에 보여줄 용도)
    
      try{downloadFile(e).then(fileUrl => { //file 다운로드 url 반환
        var liTag = document.createElement("li");
        liTag.className = "my-1";
        var aTag = document.createElement("a");
        aTag.innerHTML = `<h6><a href="${fileUrl}">${fileName}</a><span style="margin-left: 10%;" class="badge rounded-pill text-bg-success">${patient.name}Read Success</span></h6>`;
        aTag.href= fileUrl;
        aTag.download = fileName;
        liTag.appendChild(aTag);
        ulFileList.appendChild(liTag);
      });
    }catch(error){
        var liTag = document.createElement("li");
        liTag.className = "my-1";
        liTag.innerHTML = `<b><span class="text-danger">${e.id}에 접근권한이 없습니다: Read Fail</span></b>`;
        ulFileList.appendChild(liTag);
      }

    })
  })
}

async function downloadFile(url){

  try{
    const file = await getFile(url, { fetch: authFetch });
    const fileUrl = window.URL.createObjectURL(file);
    return fileUrl;
  }catch(error){
    console.log('에러 발생');
    throw "error";
  }
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
  const p = patientList.find(e => e.id == id)
  selectedPatientList.push(p);

  document.getElementById("errorMessage").innerHTML="";
  document.getElementById("selectedPatientList").innerHTML+=`<span class='badge text-bg-light mx-1'>#${p.name}<button style="border: 0px; background:none;">x</button></span>`;
}

document.getElementById("btnReadFile").onclick = function () {
  getPatientFileList();
}