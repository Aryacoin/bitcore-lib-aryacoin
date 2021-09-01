'use strict';
/* jshint unused: false */
var _ = require('lodash');
var assert = require('assert');
var should = require('chai').should();
var expect = require('chai').expect;
var ayacore = require('..');
var errors = ayacore.errors;
var hdErrors = errors.HDPrivateKey;
var buffer = require('buffer');
var Networks = ayacore.Networks;
var BufferUtil = ayacore.util.buffer;
var HDPrivateKey = ayacore.HDPrivateKey;
var Base58Check = ayacore.encoding.Base58Check;

var xprivkey = 'xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi';
var json = '{"network":"livenet","depth":0,"fingerPrint":876747070,"parentFingerPrint":0,"childIndex":0,"chainCode":"873dff81c02f525623fd1fe5167eac3a55a049de3d314bb42ee227ffed37d508","privateKey":"e8f32e723decf4051aefac8e2c93c9c5b214313817cdb01a1494b917c8436b35","checksum":-411132559,"xprivkey":"xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi"}';
describe('HDPrivate key interface', function() {
  /* jshint maxstatements: 50 */
  var expectFail = function(func, error) {
    var got = null;
    try {
      func();
    } catch (e) {
      got = e instanceof error;
    }
    expect(got).to.equal(true);
  };

  var expectDerivationFail = function(argument, error) {
    return expectFail(function() {
      var privateKey = new HDPrivateKey(xprivkey);
      privateKey.derive(argument);
    }, error);
  };

  var expectFailBuilding = function(argument, error) {
    return expectFail(function() {
      return new HDPrivateKey(argument);
    }, error);
  };

  var expectSeedFail = function(argument, error) {
    return expectFail(function() {
      return HDPrivateKey.fromSeed(argument);
    }, error);
  };

  it('should make a new private key from random', function() {
    should.exist(new HDPrivateKey().xprivkey);
  });

  it('should make a new private key from random for testnet', function() {
    var key = new HDPrivateKey('testnet');
    should.exist(key.xprivkey);
    key.network.name.should.equal('testnet');
  });

  it('should not be able to change read-only properties', function() {
    var hdkey = new HDPrivateKey();
    expect(function() {
      hdkey.fingerPrint = 'notafingerprint';
    }).to.throw(TypeError);
  });

  it('should error with an invalid checksum', function() {
    expectFailBuilding(xprivkey + '1', errors.InvalidB58Checksum);
  });

  it('can be rebuilt from a json generated by itself', function() {
    var regenerate = new HDPrivateKey(json);
    regenerate.xprivkey.should.equal(xprivkey);
  });

  it('builds a json keeping the structure and same members', function() {
    assert(_.isEqual(
      new HDPrivateKey(json).toJSON(),
      new HDPrivateKey(xprivkey).toJSON()
    ));
  });

  describe('instantiation', function() {
    it('invalid argument: can not instantiate from a number', function() {
      expectFailBuilding(1, hdErrors.UnrecognizedArgument);
    });
    it('allows no-new calling', function() {
      HDPrivateKey(xprivkey).toString().should.equal(xprivkey);
    });
    it('allows the use of a copy constructor', function() {
      HDPrivateKey(HDPrivateKey(xprivkey))
        .xprivkey.should.equal(xprivkey);
    });
  });

  describe('public key', function() {
    var testnetKey = new HDPrivateKey('tprv8ZgxMBicQKsPdEeU2KiGFnUgRGriMnQxrwrg6FWCBg4jeiidHRyCCdA357kfkZiGaXEapWZsGDKikeeEbvgXo3UmEdbEKNdQH9VXESmGuUK');
    var livenetKey = new HDPrivateKey('xprv9s21ZrQH143K3e39bnn1vyS7YFa1EAJAFGDoeHaSBsgBxgAkTEXeSx7xLvhNQNJxJwhzziWcK3znUFKRPRwWBPkKZ8ijUBa5YYpYPQmeBDX');

    it('matches the network', function() {
      testnetKey.publicKey.network.should.equal(Networks.testnet);
      livenetKey.publicKey.network.should.equal(Networks.livenet);
    });

    it('cache for xpubkey works', function() {
      var privateKey = new HDPrivateKey(xprivkey);
      should.not.exist(privateKey._hdPublicKey);
      privateKey.xpubkey.should.equal(privateKey.xpubkey);
      should.exist(privateKey._hdPublicKey);
    });

  });

  it('inspect() displays correctly', function() {
    HDPrivateKey(xprivkey).inspect().should.equal('<HDPrivateKey: ' + xprivkey + '>');
  });
  it('fails when trying to derive with an invalid argument', function() {
    expectDerivationFail([], hdErrors.InvalidDerivationArgument);
  });

  it('catches early invalid paths', function() {
    expectDerivationFail('s', hdErrors.InvalidPath);
  });

  it('allows derivation of hardened keys by passing a very big number', function() {
    var privateKey = new HDPrivateKey(xprivkey);
    var derivedByNumber = privateKey.derive(0x80000000);
    var derivedByArgument = privateKey.derive(0, true);
    derivedByNumber.xprivkey.should.equal(derivedByArgument.xprivkey);
  });

  it('returns itself with \'m\' parameter', function() {
    var privateKey = new HDPrivateKey(xprivkey);
    privateKey.should.equal(privateKey.derive('m'));
  });

  it('returns InvalidArgument if invalid data is given to getSerializedError', function() {
    expect(
      HDPrivateKey.getSerializedError(1) instanceof hdErrors.UnrecognizedArgument
    ).to.equal(true);
  });

  it('returns InvalidLength if data of invalid length is given to getSerializedError', function() {
    var b58s = Base58Check.encode(new buffer.Buffer('onestring'));
    expect(
      HDPrivateKey.getSerializedError(b58s) instanceof hdErrors.InvalidLength
    ).to.equal(true);
  });

  it('returns InvalidNetworkArgument if an invalid network is provided', function() {
    expect(
      HDPrivateKey.getSerializedError(xprivkey, 'invalidNetwork') instanceof errors.InvalidNetworkArgument
    ).to.equal(true);
  });

  it('recognizes that the wrong network was asked for', function() {
    expect(
      HDPrivateKey.getSerializedError(xprivkey, 'testnet') instanceof errors.InvalidNetwork
    ).to.equal(true);
  });

  it('recognizes the correct network', function() {
    expect(HDPrivateKey.getSerializedError(xprivkey, 'livenet')).to.equal(null);
  });

  describe('on creation from seed', function() {
    it('converts correctly from an hexa string', function() {
      should.exist(HDPrivateKey.fromSeed('01234567890abcdef01234567890abcdef').xprivkey);
    });
    it('fails when argument is not a buffer or string', function() {
      expectSeedFail(1, hdErrors.InvalidEntropyArgument);
    });
    it('fails when argument doesn\'t provide enough entropy', function() {
      expectSeedFail('01', hdErrors.InvalidEntropyArgument.NotEnoughEntropy);
    });
    it('fails when argument provides too much entropy', function() {
      var entropy = '0';
      for (var i = 0; i < 129; i++) {
        entropy += '1';
      }
      expectSeedFail(entropy, hdErrors.InvalidEntropyArgument.TooMuchEntropy);
    });
  });

  it('correctly errors if an invalid checksum is provided', function() {
    var privKey = new HDPrivateKey(xprivkey);
    var error = null;
    try {
      var buffers = privKey._buffers;
      buffers.checksum = BufferUtil.integerAsBuffer(0);
      var privateKey = new HDPrivateKey(buffers);
    } catch (e) {
      error = e;
    }
    expect(error instanceof errors.InvalidB58Checksum).to.equal(true);
  });
  it('correctly validates the checksum', function() {
    var privKey = new HDPrivateKey(xprivkey);
    expect(function() {
      var buffers = privKey._buffers;
      return new HDPrivateKey(buffers);
    }).to.not.throw();
  });

  it('shouldn\'t matter if derivations are made with strings or numbers', function() {
    var privateKey = new HDPrivateKey(xprivkey);
    var derivedByString = privateKey.derive('m/0\'/1/2\'');
    var derivedByNumber = privateKey.derive(0, true).derive(1).derive(2, true);
    derivedByNumber.xprivkey.should.equal(derivedByString.xprivkey);
  });

  describe('validates paths', function() {
    it('validates correct paths', function() {
      var valid;

      valid = HDPrivateKey.isValidPath('m/0\'/1/2\'');
      valid.should.equal(true);

      valid = HDPrivateKey.isValidPath('m');
      valid.should.equal(true);

      valid = HDPrivateKey.isValidPath(123, true);
      valid.should.equal(true);

      valid = HDPrivateKey.isValidPath(123);
      valid.should.equal(true);

      valid = HDPrivateKey.isValidPath(HDPrivateKey.Hardened + 123);
      valid.should.equal(true);

      valid = HDPrivateKey.isValidPath(HDPrivateKey.Hardened + 123, true);
      valid.should.equal(true);
    });


    var invalid = [
      'm/-1/12',
      'bad path',
      'K',
      'm/',
      'm/12asd',
      'm/1/2//3'
    ];

    invalid.forEach(function(datum) {
      it('rejects illegal path ' + datum, function() {
        HDPrivateKey.isValidPath(datum).should.equal(false);
        expect(HDPrivateKey._getDerivationIndexes(datum)).to.equal(null);
      });
    });

    it('generates deriving indexes correctly', function() {
      var indexes;

      indexes = HDPrivateKey._getDerivationIndexes('m/-1/12');
      expect(indexes).to.equal(null);

      indexes = HDPrivateKey._getDerivationIndexes('m/0/12/12\'');
      indexes.should.eql([0, 12, HDPrivateKey.Hardened + 12]);

      indexes = HDPrivateKey._getDerivationIndexes('m/0/12/12\'');
      indexes.should.eql([0, 12, HDPrivateKey.Hardened + 12]);
    });

  });

  describe('conversion to/from buffer', function() {
    var str = 'xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi';
    it('should roundtrip to/from a buffer', function() {
      var priv = new HDPrivateKey(str);
      var toBuffer = priv.toBuffer();
      var fromBuffer = HDPrivateKey.fromBuffer(toBuffer);
      var roundTrip = new HDPrivateKey(fromBuffer.toBuffer());
      roundTrip.xprivkey.should.equal(str);
    });
  });

  describe('conversion to plain object/json', function() {
    var plainObject = {
      'network': 'livenet',
      'depth': 0,
      'fingerPrint': 876747070,
      'parentFingerPrint': 0,
      'childIndex': 0,
      'chainCode': '873dff81c02f525623fd1fe5167eac3a55a049de3d314bb42ee227ffed37d508',
      'privateKey': 'e8f32e723decf4051aefac8e2c93c9c5b214313817cdb01a1494b917c8436b35',
      'checksum': -411132559,
      'xprivkey': 'xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvN' +
        'KmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi'
    };
    it('toObject leaves no Buffer instances', function() {
      var privKey = new HDPrivateKey(xprivkey);
      var object = privKey.toObject();
      _.each(_.values(object), function(value) {
        expect(BufferUtil.isBuffer(value)).to.equal(false);
      });
    });
    it('roundtrips toObject', function() {
      expect(HDPrivateKey.fromObject(new HDPrivateKey(xprivkey).toObject()).xprivkey).to.equal(xprivkey);
    });
    it('roundtrips to JSON and to Object', function() {
      var privkey = new HDPrivateKey(xprivkey);
      expect(HDPrivateKey.fromObject(privkey.toJSON()).xprivkey).to.equal(xprivkey);
    });
    it('recovers state from JSON', function() {
      new HDPrivateKey(JSON.stringify(plainObject)).xprivkey.should.equal(xprivkey);
    });
    it('recovers state from Object', function() {
      new HDPrivateKey(plainObject).xprivkey.should.equal(xprivkey);
    });
  });
});
