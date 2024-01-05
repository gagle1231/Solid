# Solid Hospital App

앱 설명: [https://www.notion.so/Hospital-App-179c1a375a4342bd8edeccf02d891ace?pvs=4](https://spectacular-macrame-8dd.notion.site/Hospital-App-179c1a375a4342bd8edeccf02d891ace)


📌Hospital app 실행: 

```
$npm install
$npm start
```

*번들러는 parcel 이용
* * *  


### **id/secret 발급 받기**

Access Token을 발급 받기 위해 최초 1회만 발급 받은 후 개인적으로 저장하여 사용(다시 발급 받을 수는 있음), 발급 받기 버튼을 누르면 Authorize 부분에 id와 Secret이 자동으로 넘어감

### **Authorize**

환자 팟에 접근하기 위한 Access Token을 발급 받는 부분, 토큰 발급 받기 버튼을 누른 후 토큰 발급이 성공적으로 이루어지면 토큰이 발급되었다는 메세지와 함께 메인 화면 상단 Nav bar에 병원 아이디가 뜸



### 환자 선택하기

등록된 환자 리스트에서 파일을 전달하거나 수신할 환자를 선택할 수 있다

여러 명 선택 시 아래 환자 리스트에 각 환자 이름이 표시됨

### 환자에게 파일 전달

병원에서 환자의 public 컨테이너에 파일 전달

### 환자 파일 수신 리스트

선택된 환자들의 private 컨테이너에서 파일 수신 후 수신 성공 여부 확인, 파일 이름 클릭 시 이미지 파일이 다운로드 됨 


### 🗒️memo

-파일 보내기는 잘 동작하나, 파일 읽어오는 부분은 에러 처리 수정 필요

-로그인 유지하도록 구현 필요(refresh token)

-모달창 수정 필요

-추후 리액트 앱으로 수정
