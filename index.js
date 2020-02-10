let isAlreadyCalling = false;
let getCalled = false;
var localVideoStream = null
const existingCalls = [];

const { RTCPeerConnection, RTCSessionDescription } = window;

const peerConnection = new RTCPeerConnection();

function unselectUsersFromList() {
  const alreadySelectedUser = document.querySelectorAll(
    ".active-user.active-user--selected"
  );

  alreadySelectedUser.forEach(el => {
    el.setAttribute("class", "active-user");
  });
}

function createUserItemContainer(socketId) {
  const userContainerEl = document.createElement("div");

  const usernameEl = document.createElement("p");

  userContainerEl.setAttribute("class", "active-user");
  userContainerEl.setAttribute("id", socketId);
  usernameEl.setAttribute("class", "username");
  usernameEl.innerHTML = `Socket: ${socketId}`;

  userContainerEl.appendChild(usernameEl);

  userContainerEl.addEventListener("click", () => {
    openStream()
    .then(stream => {
      const localVideo = document.getElementById("local-video");
      if (localVideo) {
        localVideo.srcObject = stream;
      }
  
      stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
      unselectUsersFromList();
    userContainerEl.setAttribute("class", "active-user active-user--selected");
    const talkingWithInfo = document.getElementById("talking-with-info");
    talkingWithInfo.innerHTML = `Talking with: "Socket: ${socketId}"`;
    callUser(socketId);
    });
  });

  return userContainerEl;
}

async function callUser(socketId) {
  
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(new RTCSessionDescription(offer));
  peerConnection.onicecandidate = function(icecandidate) {
    console.log("CANDIDATE_SENT111")
    const candidate = icecandidate.candidate
    console.log(candidate)
    if (candidate){
      socket.emit("SEND_CANDIDATE", {
        candidate,
        to: socketId
      });
      
    };
    
  };
  socket.emit("call-user", {
    sdp: offer,
    to: socketId
  });
}
async function answerUser(data) {
  await peerConnection.setRemoteDescription(
    new RTCSessionDescription(data.offer)
  );
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(new RTCSessionDescription(answer));
  console.log("answer data")
  socket.emit("make-answer", {
    sdp: answer,
    to: data.socket
  });
  getCalled = true;
}
function updateUserList(socketIds) {
  const activeUserContainer = document.getElementById("active-user-container");

  socketIds.forEach(socketId => {
    const alreadyExistingUser = document.getElementById(socketId);
    if (!alreadyExistingUser) {
      const userContainerEl = createUserItemContainer(socketId);

      activeUserContainer.appendChild(userContainerEl);
    }
  });
}

const socket = io.connect("https://zinzinwebrtcdemoinios.herokuapp.com");

socket.on("update-user-list", ({ users }) => {
  updateUserList(users);
});

socket.on("remove-user", ({ socketId }) => {
  const elToRemove = document.getElementById(socketId);

  if (elToRemove) {
    elToRemove.remove();
  }
});

socket.on("call-made", async data => {
  console.log("call-made")
  if (getCalled) {
    console.log("vao day roi122222")
    confirmAnser(data);
    return;
  }
  console.log("vao day roi23")
  openStream()
    .then(stream => {
      localVideoStream = stream;
      const localVideo = document.getElementById("local-video");
      if (localVideo) {
        localVideo.srcObject = stream;
      }
  
      stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
      answerUser(data)
  });
  
  
});

socket.on("CANDIDATE_SENT", async data => {
  // console.log('CANDIDATE_SENT Nhan ve')
  
  const candidate = data.candidate
  // console.log(candidate)
  await peerConnection.addIceCandidate(candidate);
});
socket.on("answer-made", async data => {
  console.log("answer-made")
  await peerConnection.setRemoteDescription(
    new RTCSessionDescription(data.answer)
  );

  if (!isAlreadyCalling) {
    callUser(data.socket);
    isAlreadyCalling = true;
  }
});

socket.on("call-rejected", data => {
  alert(`User: "Socket: ${data.socket}" rejected your call.`);
  unselectUsersFromList();
  peerConnection.close();
  if (localVideoStream) {
    localVideoStream.getTracks().forEach(function (track) {
      track.stop();
    });
    localVideo.srcObject = "";
  }
});

peerConnection.ontrack = function({ streams: [stream] }) {
  const remoteVideo = document.getElementById("remote-video");
  if (remoteVideo) {
    remoteVideo.srcObject = stream;
  }
};
function openStream(){
  const config = {audio: true, video: true};
  return navigator.mediaDevices.getUserMedia(config);
}
// navigator.getUserMedia(
//   { video: true, audio: true },
//   stream => {
//     const localVideo = document.getElementById("local-video");
//     if (localVideo) {
//       localVideo.srcObject = stream;
//     }

//     stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
//   },
//   error => {
//     console.warn(error.message);
//   }
// );
function confirmAnser(data){
  document.getElementById('id_confrmdiv').style.display="block"; //this is the replace of this line  
  document.getElementById('id_truebtn').onclick = function(){
     //do your delete operation
     document.getElementById('id_confrmdiv').style.display="none";
     openStream()
    .then(stream => {
      localVideoStream = stream;
      const localVideo = document.getElementById("local-video");
      if (localVideo) {
        localVideo.srcObject = stream;
      }
  
      stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
      answerUser(data)
  });
  };
  
  document.getElementById('id_falsebtn').onclick = function(){
      document.getElementById('id_confrmdiv').style.display="none";
      socket.emit("reject-call", {
        from: data.socket
      });
      unselectUsersFromList();
  peerConnection.close();
  if (localVideoStream) {
    localVideoStream.getTracks().forEach(function (track) {
      track.stop();
    });
    localVideo.srcObject = "";
  }
  };
}
