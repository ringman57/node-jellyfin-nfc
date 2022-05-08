import nfcCard from 'nfccard-tool';
import { NFC } from 'nfc-pcsc';
import process_jellyfin_command from '../process_jellyfin_command.js';
import jellyfin_nfc from '../jellyfin_nfc.js';
import EventEmitter from './event_emitter.js';
import { jest } from '@jest/globals';

jest.mock('../process_jellyfin_command.js');

describe('jellyfin_nfc', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('Listens for reader ready event', () => {
    // Setup
    const nfc = {
      on: jest.fn(),
    };

    // Act
    jellyfin_nfc(nfc);

    // Assert
    expect(nfc.on).toBeCalledWith('reader', expect.any(Function));
  });

  test('Calls process_jellyfin_command when card text message is successfully processed', async () => {
    // Setup
    const nfc = new EventEmitter();
    const command = 'spotify:abc123';
    const mockReader = new EventEmitter({
      read: () => Promise.resolve(command),
      reader: {
        name: 'Mock Reader',
      },
    });
    const card = {
      type: 'ntag',
      uid: '043A98CABB2B80',
    };

    nfcCard.isFormatedAsNDEF.mockImplementation(() => true);
    nfcCard.hasReadPermissions.mockImplementation(() => true);
    nfcCard.hasNDEFMessage.mockImplementation(() => true);
    nfcCard.parseNDEF.mockImplementation((msg) => [
      {
        type: 'text',
        text: msg,
      },
    ]);

    // Act
    jellyfin_nfc(nfc);
    await nfc.emit('reader', mockReader);
    await mockReader.emit('card', card);

    // Assert
    expect(process_jellyfin_command).toHaveBeenCalledWith(command);
  });

  test('Calls process_jellyfin_command when card URI message is successfully processed', async () => {
    // Setup
    const nfc = new EventEmitter();
    const command = 'spotify:abc123';
    const mockReader = new EventEmitter({
      read: () => Promise.resolve(command),
      reader: {
        name: 'Mock Reader',
      },
    });
    const card = {
      type: 'ntag',
      uid: '043A98CABB2B80',
    };

    nfcCard.isFormatedAsNDEF.mockImplementation(() => true);
    nfcCard.hasReadPermissions.mockImplementation(() => true);
    nfcCard.hasNDEFMessage.mockImplementation(() => true);
    nfcCard.parseNDEF.mockImplementation((msg) => [
      {
        type: 'uri',
        uri: msg,
      },
    ]);

    // Act
    jellyfin_nfc(nfc);
    await nfc.emit('reader', mockReader);
    await mockReader.emit('card', card);

    // Assert
    expect(process_jellyfin_command).toHaveBeenCalledWith(command);
  });

  test('Logs error message when card format is invalid', async () => {
    // Setup
    const log = jest.spyOn(console, 'log');
    const nfc = new EventEmitter();
    const mockReader = new EventEmitter({
      read: () => Promise.resolve({}),
      reader: {
        name: 'Mock Reader',
      },
    });
    const card = {
      type: 'ntag',
      uid: '043A98CABB2B80',
    };

    // Act
    jellyfin_nfc(nfc);
    await nfc.emit('reader', mockReader);
    await mockReader.emit('card', card);

    // Assert
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('Could not parse anything from this tag')
    );
  });

  test('Logs message when card is removed', async () => {
    // Setup
    const log = jest.spyOn(console, 'log');
    const nfc = new EventEmitter();
    const mockReader = new EventEmitter({
      read: jest.fn((start, end) => Promise.resolve(new Buffer())),
      reader: {
        name: 'Mock Reader',
      },
    });
    const card = {
      type: 'ntag',
      uid: '043A98CABB2B80',
    };

    // Act
    jellyfin_nfc(nfc);
    await nfc.emit('reader', mockReader);
    await mockReader.emit('card.off', card);

    // Assert
    expect(log).toHaveBeenNthCalledWith(
      3,
      `${mockReader.reader.name}: ${card.type} with UID ${card.uid} removed`
    );
  });

  test('Logs error message when card can’t be read', async () => {
    // Setup
    const log = jest.spyOn(console, 'error');
    const nfc = new EventEmitter();
    const error = 'Nope, did not work';
    const mockReader = new EventEmitter({
      read: () => Promise.reject(error),
      reader: {
        name: 'Mock Reader',
      },
    });
    const card = {
      type: 'ntag',
      uid: '043A98CABB2B80',
    };

    // Act
    jellyfin_nfc(nfc);
    await nfc.emit('reader', mockReader);
    await mockReader.emit('card', card);

    // Assert
    expect(log).toHaveBeenCalledWith(error);
  });

  test('Logs message when card is removed', async () => {
    // Setup
    const log = jest.spyOn(console, 'log');
    const nfc = new EventEmitter();
    const mockReader = new EventEmitter({
      read: jest.fn((start, end) => Promise.resolve(new Buffer())),
      reader: {
        name: 'Mock Reader',
      },
    });
    const card = {
      type: 'ntag',
      uid: '043A98CABB2B80',
    };

    // Act
    jellyfin_nfc(nfc);
    await nfc.emit('reader', mockReader);
    await mockReader.emit('card.off', card);

    // Assert
    expect(log).toHaveBeenNthCalledWith(
      3,
      `${mockReader.reader.name}: ${card.type} with UID ${card.uid} removed`
    );
  });

  test('Logs message when reader throws error', async () => {
    // Setup
    const log = jest.spyOn(console, 'log');
    const nfc = new EventEmitter();
    const mockReader = new EventEmitter({
      read: jest.fn((start, end) => Promise.resolve(new Buffer())),
      reader: {
        name: 'Mock Reader',
      },
    });
    const error = 'Nope, did not work';

    // Act
    jellyfin_nfc(nfc);
    await nfc.emit('reader', mockReader);
    await mockReader.emit('error', error);

    // Assert
    expect(log).toHaveBeenNthCalledWith(
      3,
      `${mockReader.reader.name} an error occurred`,
      error
    );
  });

  test('Logs message when reader is disconnected', async () => {
    // Setup
    const log = jest.spyOn(console, 'log');
    const nfc = new EventEmitter();
    const mockReader = new EventEmitter({
      read: jest.fn((start, end) => Promise.resolve(new Buffer())),
      reader: {
        name: 'Mock Reader',
      },
    });

    // Act
    jellyfin_nfc(nfc);
    await nfc.emit('reader', mockReader);
    await mockReader.emit('end');

    // Assert
    expect(log).toHaveBeenNthCalledWith(
      3,
      `${mockReader.reader.name} device removed`
    );
  });

  test('Logs message when NFC library returns error', async () => {
    // Setup
    const log = jest.spyOn(console, 'log');
    const nfc = new EventEmitter();
    const error = 'Nope, did not work';

    // Act
    jellyfin_nfc(nfc);
    await nfc.emit('error', error);

    // Assert
    expect(log).toHaveBeenNthCalledWith(2, 'an NFC error occurred', error);
  });
});
