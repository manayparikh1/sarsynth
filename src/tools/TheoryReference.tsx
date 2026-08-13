import { useState } from 'react';
import { SCALES, TONICS } from '../music/ragas';
import { JUST_RATIOS, SWARAS, pitchOf, swaraAt } from '../music/swaras';
import { playNote, transposeName } from './toolAudio';
import { Segmented, ToolShell, TonicPicker } from './ToolChrome';

type Tab = 'swaras' | 'thaats' | 'intervals' | 'chords';

const RATIO_TEXT = [
    '1/1',
    '16/15',
    '9/8',
    '6/5',
    '5/4',
    '4/3',
    '45/32',
    '3/2',
    '8/5',
    '5/3',
    '16/9',
    '15/8',
];

const INTERVALS: { semi: number; western: string; short: string; feel: string }[] = [
    { semi: 0, western: 'Unison', short: 'P1', feel: 'The ground. Everything else is heard against it' },
    { semi: 1, western: 'Minor second', short: 'm2', feel: 'Tight and pressing — komal Re leaning back onto Sa' },
    { semi: 2, western: 'Major second', short: 'M2', feel: 'One clean step up' },
    { semi: 3, western: 'Minor third', short: 'm3', feel: 'The shade that makes a scale sound minor' },
    { semi: 4, western: 'Major third', short: 'M3', feel: 'Bright and settled' },
    { semi: 5, western: 'Perfect fourth', short: 'P4', feel: 'Strong and stable — the second pillar after Sa' },
    { semi: 6, western: 'Tritone', short: 'TT', feel: 'Restless. Tivra Ma, the swara that colours Yaman and Marwa' },
    { semi: 7, western: 'Perfect fifth', short: 'P5', feel: 'The most consonant step there is. Pa, the drone partner' },
    { semi: 8, western: 'Minor sixth', short: 'm6', feel: 'Heavy and grave — komal Dha' },
    { semi: 9, western: 'Major sixth', short: 'M6', feel: 'Open and singing' },
    { semi: 10, western: 'Minor seventh', short: 'm7', feel: 'Wants to fall back down — komal Ni' },
    { semi: 11, western: 'Major seventh', short: 'M7', feel: 'Right under the upper Sa, straining towards it' },
];
