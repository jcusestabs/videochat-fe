import React, { useEffect, useRef, useState } from "react";
import { Box, Grid, Card, Typography as T, TextField } from "@mui/material";
import Button from "@material-ui/core/Button";
import AssignmentIcon from "@material-ui/icons/Assignment";
import PhoneIcon from "@material-ui/icons/Phone";
import { CopyToClipboard } from "react-copy-to-clipboard";
import Peer from "simple-peer";
import io from "socket.io-client";
import "./App.css";

const socket = io.connect(process.env.REACT_APP_HOST);
function App() {
  const [me, setMe] = useState("");
  const [stream, setStream] = useState();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [idToCall, setIdToCall] = useState("");
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState("");
  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: 480,
          height: 480,
        },
        audio: true,
      })
      .then((stream) => {
        setStream(stream);
        myVideo.current.srcObject = stream;
      });

    socket.on("me", (id) => {
      setMe(id);
    });

    socket.on("callUser", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setName(data.name);
      setCallerSignal(data.signal);
    });
  }, []);

  const callUser = (id) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream,
    });
    peer.on("signal", (data) => {
      socket.emit("callUser", {
        userToCall: id,
        signalData: data,
        from: me,
        name: name,
      });
    });
    peer.on("stream", (stream) => {
      userVideo.current.srcObject = stream;
    });
    socket.on("callAccepted", (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });

    connectionRef.current = peer;
  };

  const answerCall = () => {
    setCallAccepted(true);
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
    });
    peer.on("signal", (data) => {
      socket.emit("answerCall", { signal: data, to: caller });
    });
    peer.on("stream", (stream) => {
      userVideo.current.srcObject = stream;
    });

    peer.signal(callerSignal);
    connectionRef.current = peer;
  };

  const leaveCall = () => {
    setCallEnded(true);
    connectionRef.current.destroy();
  };

  return (
    <>
      <Box sx={{ height: "100vh" }}>
        <Grid container>
          <Grid
            item
            xs={8}
            sx={{
              width: "100%",
              height: "100vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2em",
              p: 3,
            }}
          >
            <Card
              variant="outlined"
              sx={{
                height: "50%",
                maxWidth: "480px",
                aspectRatio: "16/9",
              }}
            >
              {stream && <video playsInline muted ref={myVideo} autoPlay />}
            </Card>
            <Card
              variant="outlined"
              sx={{
                height: "50%",
                maxWidth: "480px",
                aspectRatio: "16/9",
              }}
            >
              {callAccepted && !callEnded ? (
                <video playsInline ref={userVideo} autoPlay />
              ) : null}
            </Card>
          </Grid>
          <Grid item xs={4} sx={{ padding: 3, textAlign: "center" }}>
            <Card
              sx={{
                p: 2,
                display: "flex",
                flexDirection: "column",
                gap: 3,
              }}
            >
              <T variant="h3"> Zoomish</T>
              <TextField
                value={name}
                label="name"
                onChange={(e) => setName(e.target.value)}
              />
              <TextField
                label="ID to call"
                value={idToCall}
                onChange={(e) => setIdToCall(e.target.value)}
              />
              <CopyToClipboard text={me} style={{ marginBottom: "2rem" }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AssignmentIcon fontSize="large" />}
                >
                  ID
                </Button>
              </CopyToClipboard>
              {callAccepted && !callEnded ? (
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={leaveCall}
                >
                  End Call
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => callUser(idToCall)}
                >
                  <PhoneIcon fontSize="large" />
                  {idToCall}
                </Button>
              )}

              {receivingCall && !callAccepted ? (
                <Card
                  variant="outlined"
                  sx={{
                    p: 3,
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                  }}
                >
                  <T variant="6">{name} is calling...</T>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={answerCall}
                  >
                    Answer call
                  </Button>
                </Card>
              ) : null}
            </Card>
          </Grid>
        </Grid>
      </Box>
    </>
  );
}

export default App;
