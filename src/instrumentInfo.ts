export interface InstrumentBlurb {
    name: string;
    img: string;
    history: string;
}

export const LEFT_INSTRUMENTS: InstrumentBlurb[] = [
    {
        name: 'Sitar',
        img: '/img1.png',
        history:
            "The sitar grew out of the Persian setar around the 1500s, then got reshaped in Indian courts into something bigger and buzzier. Those sympathetic strings underneath aren't played directly — they just ring along with whatever you pluck, which is where that shimmering tail comes from.",
    },
    {
        name: 'Sarod',
        img: '/img2.png',
        history:
            "No frets, no fingertips — sarod players slide a fingernail along a steel fingerboard, which is why the notes glide into each other instead of stepping cleanly like a guitar. It descended from the Afghan rabab, brought to India by traveling musicians a couple centuries ago.",
    },
    {
        name: 'Veena',
        img: '/img3.png',
        history:
            "One of the oldest Indian instruments still being played, older than a lot of the theory written about it. Carved mostly from a single piece of wood with two gourd resonators, it was the go-to instrument for classical court music long before the sitar showed up.",
    },
    {
        name: 'Santoor',
        img: '/img4.png',
        history:
            "A trapezoid box of stretched strings, hit with two light wooden mallets instead of plucked. It came down from Kashmir, where for a long time it mostly backed folk singing, before players started pushing it into full classical solos in the 20th century.",
    },
];

export const RIGHT_INSTRUMENTS: InstrumentBlurb[] = [
    {
        name: 'Bansuri',
        img: '/img5.png',
        history:
            "Just a hollow bamboo tube with holes burned into it, no metal keys, nothing mechanical — about as simple as an instrument gets. It's tied closely to Krishna in Indian mythology, always pictured with a flute in hand.",
    },
    {
        name: 'Shehnai',
        img: '/img6.png',
        history:
            "A double-reed horn that's loud, a little nasal, and has been the sound of Indian weddings and outdoor festivals for centuries — it carries over a crowd in a way quieter instruments can't. Ustad Bismillah Khan is the name most associated with dragging it onto the concert stage.",
    },
    {
        name: 'Sarangi',
        img: '/img7.png',
        history:
            "Widely considered the closest instrument to the human voice, which is exactly why it's spent so much of its history accompanying singers rather than performing alone. It's also brutal to play — three main strings bowed while dozens of sympathetic strings resonate underneath, all stopped with the fingernail instead of the fingertip.",
    },
    {
        name: 'Harmonium',
        img: '/img8.png',
        history:
            "Actually a European import — a hand-pumped reed organ that arrived in India in the 1800s and got adopted so thoroughly it now feels native. Some classical purists still grumble about it since its notes are fixed and can't bend the way a voice or bowed string can.",
    },
];

export const ALL_INSTRUMENTS = [...LEFT_INSTRUMENTS, ...RIGHT_INSTRUMENTS];
