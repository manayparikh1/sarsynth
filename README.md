# **SarSynth**

## Overview - What SarSynth Actually Is

SarSynth is an entirely client-side, gesture-controlled instrument that honestly took inspiration from traditional Indian performances. This application turns your computers camera into a virtual stage where your hands function as your musical controllers. 

There is no need for key presses or string pulling; just wave your hands based on the instructions on the tools sidebar and SarSynth will interpret that gesture as your musical intent and will create audio based on the instrument that you pick (indian instrument) on the top.

The purpose is to give users, especially beginners, access to the feel of traditional indian instruments like the sitar, sarod, bansuri or even the sarangi without having any sort of prior knowledge of these Indian instruments.

So overall SarSynth is not a toy keyboard or a sample player. It is a gesture-driven synthesis engine with ragas, tuning systems, sympathetic resonance and it has controls that basically mimic instrument techniques.

## Philosophy & Design Goals

*The key concepts driving SarSynth are as follows:*

Accessibility: The ability to create music using only a webcam or the keyboard.

Expressiveness: Indian classical musical instruments use many micro gestures like meend, murki, andolan, jhala. SarSynth aims to bring that expressiveness by incorporating hand pose and movement.

Zero friction: No login required, no back-end infrastructure, no data collection, and no cloud processing. Everything happens locally.

Learning and Playing: Users will be able to explore ragas, learn more about instruments and play around with sounds using visual controls.

Performance: Low latency, real-time tracking, and synthesis capable of performing live.

## Tech Stack

*SarSynth is built with modern web technologies and runs entirely in your local host browser:*

**Frontend**

- React 19 — UI components and state management

- TypeScript — type‑safe logic for gesture interpretation and audio control

- Vite — fast development server + optimized production builds

**Audio**

- *Web Audio API*

- Custom synthesis engine

- AudioWorklet for physical‑modeling string resonance

- Per‑instrument timbre shaping

- Tanpura‑style drone generator

- Real‑time pitch glide (meend) and articulation synthesis

## Computer Vision

- *MediaPipe Hands (WASM)*

- Local hand‑landmark tracking

- No server calls

- 21‑point hand skeleton

- Smooth tracking via One‑Euro filter

- Gesture debouncing + state stability logic

## Client-side ONLY

- No backend

- No database

- No external APIs

- No user tracking

- No login/authentication

SO EVERYTHING HAPPENS ON YOUR *Device*

## App Structure and the Flow

SarSynth is basically a single-pages application also known as an SPA with layered overlays instead of traditional routes. The experience is designed to feel like a musical instrument UI rather than a measly boring instrumental website

## Start Screen 

- *Choose the input mode:*

- Webcam (gesture control)

- Camera off (keyboard/mouse mode)

- Browse instrument info first

There is also quick calibration instructions and a safety note about lighting and hand visibility.

## Instrument Info Pages (ONE OF MY FAV PARTS)

In the home page there is educational mini-pages that were connected using JS and it covers 8 instruments that are incorporated in this project.

- Sitar
- Sarod
- Veena
- Santoor
- Bansuri
- Shehnai
- Sarangi
- Harmonium

There is also a pic of each of them that I have retreieved from google so thank you Google for the pics.

*Each page includes*:

- Historical background

- Playing techniques

- Signature sound characteristics

- How SarSynth simulates that instrument

- Visual diagrams and performance notes

## Main Stage

*The core interactive environment*

- Live camera feed 

- Canvas overlay showing the hand skeleton, note labels, gesture feedback and the octave markers.

- There is also REAL-TIME audio output

## The Controls for the Top Bar 

It has quick access to the following:

- Instrument selection

- Raga and scale selection

- Drone toggle

- Help (like how to use it and stuff)

- And finally there is settings

## Games Panel

Click the games icon in the top bar and three mini-games open in a corner panel:

- Ear (कान) — a swara plays, you play it back
- Memory (याद) — repeat a growing phrase, Simon-says style
- Race (दौड़) — hit as many named swaras as you can in 30 seconds

Best scores are saved locally per game.

## Live HUD (the readout)

Displays include the current note, octave, articulation mode, sustain leave, fps, and the audio level meter.

## Settings Panel

**You can change a BUNCH of things in the settings panel**

- Instrument

- Raga/scale

- Tonic pitch (Sa)

- Tuning system (just intonation, etc.)

- Hand‑swap mode

- Volume

- Reverb

- Drone level

- Camera visibility

- Skeleton visibility

- Gesture sensitivity

## The HELP Panel

It explains:
- Gesture controls
- Keyboard controls
- Mouse drag mode
- Tips for better tracking
- And finally troubleshooting (lighting, background, camera angle)

## HOW DOES THE GESTURE-BASED PLAYING ACTUALLY WORK????

Ok so Sarsynth uses both hands for different musical roles.

**LEFT HAND is the note selection**

Finger pose → selects the swara

Vertical position → selects the octave

Horizontal position → slight pitch glide or meend

**RIGHT HAND is the expression control**

Controls the musical “feel”:

Height → volume/intensity

Tilt → tone color / timbre

Finger count → articulation mode:

- 1 finger → plain note

- 2 fingers → murki/trill

- 3 fingers → jhala/retrigger

- 4 fingers → vibrato/andolan

- 5 fingers → mute (SO it just plays the note selection parts)

**Stability Tracking**

- One‑Euro filter smooths jitter and stuff

- Debouncing prevents flicker between gestures

- Grace periods allow hands to briefly leave frame lol

## Keyboard & Mouse Mode (Camera Off)

For the people that do not wanna use the webcam or just dont have access to one can do this:

So first click the option of the very first page that you wanna pick the no camera button and then the instructions are simple:

**Keyboard Controls**
a s d f g h j k l → notes

z / x → octave down/up

spacebar → drone toggle

arrow keys → expression modifiers

**Mouse Controls**
Drag on the canvas to select notes

Vertical drag = octave

Horizontal drag = meend

Scroll wheel = expression

## Music Engine Details

SarSynth includes a full musical logic layer which is honestly the most creative part in this project...

**Ragas and Scales**
- Hindustani Ragas
- Thaats
- Western Scales
- All relative to the tonic that you want to pick for example Sa

**Tuning Systems**
- Just intonation
- Custom ratios per raga
- And finally smooth pitch transitions with your hands

**Drone Generator**
- Tanpura-style harmonic structure
- Adjustable volume
- Auto-tuned to the selected scale for example C scale etc

**Instrument Presets**
Each instrument has:
- Custom timbre (so basically a unique distinct sound that makes it special)
- Sympathetic resonance
- Glide behavior
- Attack/decay profiles
- Expression curves

## Extra Tools Interally to help with music

खोज Scale & raga finder: tap the notes and you will know its list and every thaat, raga, and western scale that actually contains them and its also playable, which is pretty cool.

शास्त्र Music theory: the 12 swaras with only the ratios and the Hz, the 10 thaats, and all the 12 intervals plus a chord builder thats mapped to sargam.

ताल Taal & metronome: this is straight forward, so its basically a cycle-based metronome (teental, jhaptaal, ektaal, rupak, keherwa, dadra + 4/4, 3/4, 5/4, 7/8) with sam/tali/khali accents, bols and tap tempo, and yes it works pretty well in a indian style but western could also be used with it.

तानपूरा Drone & shruti box: a tanpura drone on your Sa with a choice of companion string(Pa, Ma, Ni, komal Ni or Sa only), level and pluck pace, so it basically has a connection to what you play.

कान Ear trainer: play Sa then a swara from a scale you pick and you get to name it yourself and keep its score in unison.

सुर Tuner: mic pitch detection that names what you are playing as a swara above your Sa and shows many cents off it is like normal western tuners.

**Overall these 6 distinct tools have a indian connection but what I learned is that indian music has some sorta connection to every type of music like jazz or chinese music or anything. So I hope these 6 minor tools will help (around 1500 ish lines of code in total prolly.)**


## The Overview of the Architecture

*SarSynth is structured around 3 systems which include the vision, music, and audio layer:*

**Vision Layer**
This includes MediaPipe hand tracking, gesture classification, and pose smoothing.

**Music Layer**
This includes raga definitions, scale mapping, tonic selection, and tuning system logic.

**Audio Layer**
This includes resonance model, drone engine, and the AudioWorklet processing system.

## Performance Considerations

SarSynth is optimized for low-latency performance: 

- WebAssembly hand tracking

- Offloaded audio processing from the AudioWorklet thing

- Canvas changing throttled to maintain FPS

- Efficient gesture transitions

- UI updates and stuff

*Things that are recommended include good lighting, which is kinda obvious, a clean background, atleast a 720 webcam and a modern browser like chrome, edge, or firefox, but honestly chrome is the best.

## Privacy and Data

**SARSYNTH IS 1 million percent privacy-friendly**

There is no backend, no cloud proccesing, no analytics, no tracking, no storage of camera frames, and ALL hand tracking runs locally.

*So your camera feed never ever leaves your device.

## Future Plans

SO overall this project has a lot already but if I would have to make this better heres what I would possibly do...

*Potential Expansions*:

- Multi‑hand instruments (tabla, pakhawaj)

- Custom raga editor

- MIDI output

- Recording + export

- Mobile version

- AI‑assisted raga suggestions

- Gesture‑based gamified learning mode

## Conclusion

***SO overall Sarsynth is a browser-based, gesture controlled(from your hands) Indian classical instrument synth or simulator. And it basically mixes computer vision and raga theory into a fun musical tool that legit anyone can play with just a camera of a keyboard or EVEN a mouse if you are using no webcam mode.***

## License
This project is free to use, modify, and distribute for any purpose. No warranty is provided.

# **2026 SarSynth**
