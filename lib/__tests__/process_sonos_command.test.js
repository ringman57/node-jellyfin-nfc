import process_jellyfin_command, {
  get_jellyfin_url,
} from '../process_jellyfin_command.js';

describe('process_jellyfin_command', () => {
  beforeEach(() => {
    fetch.resetMocks();
  });

  const identifier = 'my-awesome-url';

  const commands = [
    {
      service: 'Apple Music format #1',
      input: `apple:${identifier}`,
      expected_url: get_jellyfin_url(
        `applemusic/now/${identifier}`,
        'applemusic'
      ),
    },
    {
      service: 'Apple Music format #2',
      input: `applemusic:${identifier}`,
      expected_url: get_jellyfin_url(
        `applemusic/now/${identifier}`,
        'applemusic'
      ),
    },
    {
      service: 'Local Music Library',
      input: `http:${identifier}`,
      expected_url: get_jellyfin_url(`http:${identifier}`, 'completeurl'),
    },
    {
      service: 'Spotify',
      input: `spotify:${identifier}`,
      expected_url: get_jellyfin_url(
        `spotify/now/spotify:${identifier}`,
        'spotify'
      ),
    },
    {
      service: 'Amazon Music',
      input: `amazonmusic:${identifier}`,
      expected_url: get_jellyfin_url(
        `amazonmusic/now/${identifier}`,
        'amazonmusic'
      ),
    },
    {
      service: 'TuneIn',
      input: `tunein:${identifier}`,
      expected_url: get_jellyfin_url(
        `tunein/now/tunein:${identifier}`,
        'tunein'
      ),
    },
    {
      service: 'jellyfin Playlist',
      input: `playlist:${identifier}`,
      expected_url: get_jellyfin_url(
        `playlist/${identifier}`,
        'jellyfin_playlist'
      ),
    },
  ];

  test.each(commands)(
    'Processes $service URLs',
    async ({ input, expected_url }) => {
      fetch.mockResponse(() => {
        return Promise.resolve({
          ok: true,
          body: JSON.stringify({ message: 'Hello from the mock' }),
        });
      });

      await process_jellyfin_command(input);

      expect(fetch).toHaveBeenNthCalledWith(5, expected_url);
    }
  );

  test('Processes playback commands', async () => {
    fetch.mockResponse(() => {
      return Promise.resolve({
        ok: true,
        body: JSON.stringify({ message: 'Hello from the mock' }),
      });
    });

    await process_jellyfin_command(`command:${identifier}`);

    const expected_url = get_jellyfin_url(identifier, 'command');

    // This covers not resetting playback options when processing a command
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(expected_url);
  });

  test('Processes room change commands', async () => {
    const log = jest.spyOn(console, 'log');
    const jellyfin_room = 'Wine Cellar';

    await process_jellyfin_command(`room:${jellyfin_room}`);

    expect(log).toHaveBeenCalledWith(
      `jellyfin room changed to ${jellyfin_room}`
    );
  });

  test('Ignores unknown services', async () => {
    const log = jest.spyOn(console, 'log');

    await process_jellyfin_command(`nonexistingservice:${identifier}`);

    const expected_url = get_jellyfin_url('command', identifier);

    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('Service type not recognised')
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  test('Playback options are reset when a new play request comes in', async () => {
    fetch.mockResponse(() => {
      return Promise.resolve({
        ok: true,
        body: JSON.stringify({ message: 'Hello from the mock' }),
      });
    });

    await process_jellyfin_command(`spotify:${identifier}`);

    const expected_url = get_jellyfin_url('spotify', identifier);

    expect(fetch).toHaveBeenNthCalledWith(1, get_jellyfin_url('repeat/off'));
    expect(fetch).toHaveBeenNthCalledWith(2, get_jellyfin_url('shuffle/off'));
    expect(fetch).toHaveBeenNthCalledWith(3, get_jellyfin_url('crossfade/off'));
    expect(fetch).toHaveBeenNthCalledWith(4, get_jellyfin_url('clearqueue'));
  });

  test('Throws when request is unsuccessful', async () => {
    fetch.mockResponse(() => {
      return Promise.resolve({
        ok: false,
        status: 422,
        body: JSON.stringify({ error: 'Oh no' }),
      });
    });

    try {
      await process_jellyfin_command(`command:${identifier}`);
    } catch (error) {
      expect(error).toEqual(
        new Error(`Unexpected response while sending instruction: 422`)
      );
    }
  });
});
