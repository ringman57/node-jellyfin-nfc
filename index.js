import { NFC } from 'nfc-pcsc';
import jellyfin_nfc from './lib/jellyfin_nfc.js';

const nfc = new NFC();

jellyfin_nfc(nfc);
