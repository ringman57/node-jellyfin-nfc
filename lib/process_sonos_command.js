import fetch from 'node-fetch';
import fs from 'fs';

var { jellyfin_room, jellyfin_http_api } = JSON.parse(
  fs.readFileSync('usersettings.json', 'utf-8')
);

export const get_jellyfin_url = (jellyfin_instruction, service_type) => {
  if (service_type == 'completeurl') {
    return jellyfin_instruction;
  }

  return jellyfin_http_api + '/' + jellyfin_room + '/' + jellyfin_instruction;
};

export default async function process_jellyfin_command(received_text) {
  let service_type, jellyfin_instruction;
  let received_text_lower = received_text.toLowerCase();

  if (received_text_lower.startsWith('apple:')) {
    service_type = 'applemusic';
    jellyfin_instruction = 'applemusic/now/' + received_text.slice(6);
  } else if (received_text_lower.startsWith('applemusic:')) {
    service_type = 'applemusic';
    jellyfin_instruction = 'applemusic/now/' + received_text.slice(11);
  } else if (received_text_lower.startsWith('http')) {
    service_type = 'completeurl';
    jellyfin_instruction = received_text;
  } else if (received_text_lower.startsWith('spotify:')) {
    service_type = 'spotify';
    jellyfin_instruction = 'spotify/now/' + received_text;
  } else if (received_text_lower.startsWith('tunein:')) {
    service_type = 'tunein';
    jellyfin_instruction = 'tunein/now/' + received_text;
  } else if (received_text_lower.startsWith('amazonmusic:')) {
    service_type = 'amazonmusic';
    jellyfin_instruction = 'amazonmusic/now/' + received_text.slice(12);
  } else if (received_text_lower.startsWith('playlist:')) {
    service_type = 'jellyfin_playlist';
    jellyfin_instruction = 'playlist/' + received_text.slice(9);
  } else if (received_text_lower.startsWith('command:')) {
    service_type = 'command';
    jellyfin_instruction = received_text.slice(8);
  } else if (received_text_lower.startsWith('room:')) {
    jellyfin_room = received_text.slice(5);
    console.log(`jellyfin room changed to ${jellyfin_room}`);
    return;
  }

  if (!service_type) {
    console.log(
      'Service type not recognised. Text should begin ' +
        "'spotify', 'tunein', 'amazonmusic', 'apple'/'applemusic', 'command', 'http', 'playlist', or 'room'."
    );
    return;
  }

  console.log("Detected '%s' service request", service_type);

  if (service_type != 'command') {
    console.log(
      'Resetting jellyfin queue (clear, turn off repeat, shuffle, crossfade)'
    );
    let res;
    res = await fetch(get_jellyfin_url('repeat/off'));
    if (!res.ok)
      throw new Error(
        `Unexpected response while turning repeat off: ${res.status}`
      );
    await new Promise((resolve) => setTimeout(resolve, 200));
    res = await fetch(get_jellyfin_url('shuffle/off'));
    if (!res.ok)
      throw new Error(
        `Unexpected response while turning shuffle off: ${res.status}`
      );
    res = await fetch(get_jellyfin_url('crossfade/off'));
    if (!res.ok)
      throw new Error(
        `Unexpected response while turning crossfade off: ${res.status}`
      );
    res = await fetch(get_jellyfin_url('clearqueue'));
    if (!res.ok)
      throw new Error(
        `Unexpected response while clearing queue: ${res.status}`
      );
  }

  const urltoget = get_jellyfin_url(jellyfin_instruction, service_type);

  // Perform the requested action on the jellyfin API
  console.log('Fetching URL via HTTP api: %s', urltoget);
  const res = await fetch(urltoget);

  if (!res.ok) {
    throw new Error(
      `Unexpected response while sending instruction: ${res.status}`
    );
  }

  console.log('jellyfin API reports: ', await res.json());

  // Wait a bit before processing next record so the API has time to respond to first command
  // e.g. want to seek on a new queue -- need the new queue to exist. Is there a way to check/confirm
  // with jellyfin that a prior command is complete? I'm not sure if this a jellyfin thing or the http API
  // sometimes throwing commands into the ether while jellyfin is busy.
  await new Promise((resolve) => setTimeout(resolve, 200));
}
