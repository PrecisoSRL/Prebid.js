import { logMessage, isFn, deepAccess, logInfo } from '../src/utils.js';
import { hasPurpose1Consent } from '../src/utils/gpdr.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';
import { getStorageManager } from '../src/storageManager.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';

const BIDDER_CODE = 'preciso';
const AD_URL = 'https://ssp-bidder.mndtrk.com/bid_request/openrtb';
// const URL_SYNC = 'https://prebid.2trk.info/sharedIdTrack.html';
const URL_SYNC = 'https://ck.2trk.info/rtb/user/usersync.aspx?';
const SUPPORTED_MEDIA_TYPES = [BANNER, NATIVE, VIDEO];
const GVLID = 874;
// let userId = 'NA';
const COOKIE_NAME = '_sharedid';
let precisoId = 'NA';
// export const storage = getStorageManager({ bidderCode: BIDDER_CODE });
export const storage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: 'sharedId' });
export const storage1 = getStorageManager({ bidderCode: BIDDER_CODE });
export const storage2 = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: BIDDER_CODE });
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,
  gvlid: GVLID,

  getUserSyncs: function (syncOptions, _, gdprConsent, uspConsent) {
    logInfo('Cr Test1 userSync')
    // const fastBidVersion = config.getConfig('criteo.fastBidVersion');
    // if (canFastBid(fastBidVersion)) {
    //   logInfo('Cr Test12 userSync')
    //   return [];
    // }

    // const refererInfo = getRefererInfo();
    // const origin = 'criteoPrebidAdapter';

    if (syncOptions.iframeEnabled && hasPurpose1Consent(gdprConsent)) {
      const queryParams = [];
      // queryParams.push(`origin=${origin}`);
      // queryParams.push(`topUrl=${refererInfo.domain}`);
      logInfo('test1 iframe enabled')
      if (gdprConsent) {
        if (gdprConsent.gdprApplies) {
          queryParams.push(`gdpr=${gdprConsent.gdprApplies == true ? 1 : 0}`);
        }
        if (gdprConsent.consentString) {
          queryParams.push(`gdpr_consent=${gdprConsent.consentString}`);
        }
      }
      if (uspConsent) {
        queryParams.push(`us_privacy=${uspConsent}`);
      }

      let sharedId = readFromAllStorages(COOKIE_NAME);
      logInfo('test1 sharedId:' + sharedId);

      let preID = storage.getCookie('_pre|usrid15');
      logInfo('test23 precisoId:' + preID)

      return [{
        type: 'iframe',
        // url: `https://gum.criteo.com/syncframe?${queryParams.join('&')}#${jsonHashSerialized}`
        // url: `${URL_SYNC}id=${sharedId}&gdpr=${gdprApplies ? 1 : 0}&gdpr_consent=${consentString}&us_privacy=${uspConsent}&t=4`
        url: `${URL_SYNC}id=${sharedId}${queryParams.join('&')}&t=4`

      }];
    }
    return [{
      type: 'iframe',
      url: `${URL_SYNC}id=sharedId&t=4`
    }
    ];
  },

  // getUserSyncs: (syncOptions, serverResponses = [], gdprConsent = {}, uspConsent = '', gppConsent = '') => {
  //   let syncs = [];
  //   let { gdprApplies, consentString = '' } = gdprConsent;
  //   logInfo('debugTest1 getUserSyncs')
  //   var browserSignature = '';
  //   getBrowserSignature().then(signature => {
  //     logInfo('testTest BS:' + signature)
  //     browserSignature = signature;
  //     logInfo('test4 broswerId:' + browserSignature);
  //   });
  //   // console.log('test broswerId:' + browserSignature);

  //   logInfo('test1 broswerId:' + browserSignature);
  //   // logInfo('test3 broswerId:' + getBrowserSignature().then(signature => {}));

  //   if (serverResponses.length > 0) {
  //     logInfo('preciso bidadapter getusersync serverResponses:' + serverResponses.toString);
  //   }
  //   if (syncOptions.iframeEnabled) {
  //     syncs.push({
  //       type: 'iframe',
  //       url: `${URL_SYNC}id=${userId}&gdpr=${gdprApplies ? 1 : 0}&gdpr_consent=${consentString}&us_privacy=${uspConsent}&t=4`

  //     });
  //   } else {
  //     syncs.push({
  //       type: 'image',
  //       url: `${URL_SYNC}id=${userId}&gdpr=${gdprApplies ? 1 : 0}&gdpr_consent=${consentString}&us_privacy=${uspConsent}&t=2`

  //     });
  //   }
  //   return syncs
  // },

  isBidRequestValid: (bid) => {
    let sharedId = readFromAllStorages(COOKIE_NAME);
    logInfo('Test sharedId :' + sharedId)
    // let sharedId = 'd466fcae%23260f%234f7c%23aceb%23b05cbbba049c';
    const testurl = 'http://localhost:8080/getUUID?UUID=' + sharedId;

    precisoId = window.localStorage.getItem('pre_Id');
    logInfo('Test 12333 pre_Id :' + precisoId)

    logInfo('Test bid pre_Id:' + !Object.is(precisoId, 'NA'))
    // Call for uuid fetch against the test url
    if (Object.is(precisoId, 'NA') || Object.is(precisoId, null) || Object.is(precisoId, undefined)) {
      getapi(testurl);
    }
    // window.localStorage.key('precisoKey')

    return Boolean(bid.bidId && bid.params && !isNaN(bid.params.publisherId) && bid.params.host == 'prebid' && !Object.is(precisoId, 'NA') && !Object.is(precisoId, null) && !Object.is(precisoId, undefined));
  },

  buildRequests: (validBidRequests = [], bidderRequest) => {
    logInfo('debugTest3 buildReq')
    // convert Native ORTB definition to old-style prebid native definition
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);
    // userId = validBidRequests[0].userId.pubcid;
    let winTop = window;
    let location;
    var offset = new Date().getTimezoneOffset();
    logInfo('timezone ' + offset);
    var city = Intl.DateTimeFormat().resolvedOptions().timeZone;
    logInfo('location test' + city)

    const countryCode = getCountryCodeByTimezone(city);
    logInfo(`The country code for ${city} is ${countryCode}`);

    // TODO: this odd try-catch block was copied in several adapters; it doesn't seem to be correct for cross-origin
    try {
      location = new URL(bidderRequest.refererInfo.page)
      winTop = window.top;
      // var idString = navigator.userAgent + navigator.language;
    } catch (e) {
      location = winTop.location;
      logMessage(e);
    };

    let request = {
      id: validBidRequests[0].bidderRequestId,
      req: validBidRequests[0],
      imp: validBidRequests.map(request => {
        const { bidId, sizes, mediaType, ortb2 } = request
        const item = {
          id: bidId,
          region: request.params.region,
          traffic: mediaType,
          bidFloor: getBidFloor(request),
          ortb2: ortb2

        }

        if (request.mediaTypes.banner) {
          item.banner = {
            format: (request.mediaTypes.banner.sizes || sizes).map(size => {
              return { w: size[0], h: size[1] }
            }),
          }
        }

        if (request.schain) {
          item.schain = request.schain;
        }

        if (request.floorData) {
          item.bidFloor = request.floorData.floorMin;
        }
        return item
      }),
      auctionId: validBidRequests[0].auctionId,
      'deviceWidth': winTop.screen.width,
      'deviceHeight': winTop.screen.height,
      'language': (navigator && navigator.language) ? navigator.language : '',
      'host': location.host,
      'page': location.pathname,
      'coppa': config.getConfig('coppa') === true ? 1 : 0,
      userId: validBidRequests[0].userId,
      user: {
        id: validBidRequests[0].userId.pubcid || '',
        uuid: precisoId || 'NA',
        geo: {
          region: city,
          geo: navigator.geolocation.getCurrentPosition(position => {
            const { latitude, longitude } = position.coords;
            return {
              latitude: latitude,
              longitude: longitude
            }
            // Show a map centered at latitude / longitude.
          }),
          utcoffset: new Date().getTimezoneOffset()
        }

      },
      site: validBidRequests[0].ortb2.site || '',
      tmax: validBidRequests[0].timeout || 0,
      device: validBidRequests[0].ortb2.device || ''

    };

    request.language.indexOf('-') != -1 && (request.language = request.language.split('-')[0])
    if (bidderRequest) {
      if (bidderRequest.uspConsent) {
        request.ccpa = bidderRequest.uspConsent;
      }
      if (bidderRequest.gdprConsent) {
        request.gdpr = bidderRequest.gdprConsent
      }
      if (bidderRequest.gppConsent) {
        request.gpp = bidderRequest.gppConsent;
      }
    }

    return {
      method: 'POST',
      url: AD_URL,
      data: request,

    };
  },

  interpretResponse: function (serverResponse) {
    logInfo('debugTest4 resp')
    const response = serverResponse.body

    const bids = []

    response.seatbid.forEach(seat => {
      seat.bid.forEach(bid => {
        bids.push({
          requestId: bid.impid,
          cpm: bid.price,
          width: bid.w,
          height: bid.h,
          creativeId: bid.crid,
          ad: bid.adm,
          currency: 'USD',
          netRevenue: true,
          ttl: 300,
          meta: {
            advertiserDomains: bid.adomain || [],
          },
        })
      })
    })

    return bids
  }
};

function getBrowserSignature() {
  return new Promise(async (resolve) => {
    var fingerprint = '';

    // User agent
    fingerprint += navigator.userAgent;

    // Screen resolution
    // fingerprint += screen.width + 'x' + screen.height;

    // Color depth
    fingerprint += screen.colorDepth;

    // Time zone offset
    fingerprint += new Date().getTimezoneOffset();

    // Language
    fingerprint += navigator.language;

    // Platform
    fingerprint += navigator.platform;

    // Plugins
    var plugins = '';
    for (var i = 0; i < navigator.plugins.length; i++) {
      plugins += navigator.plugins[i].name + navigator.plugins[i].description;
    }
    fingerprint += plugins;

    // Cookies enabled
    fingerprint += navigator.cookieEnabled;

    // Do Not Track
    fingerprint += navigator.doNotTrack;

    // Simulate an asynchronous call (you can replace this with your actual async operation)
    setTimeout(async () => {
      // Canvas fingerprint (requires a separate library)
      // You can use a library like fingerprintjs2 for this purpose
      // fingerprint += await Fingerprint2.getPromise();

      // Hash the fingerprint to create a unique identifier
      var hash = new TextEncoder().encode(fingerprint);
      var digest = await crypto.subtle.digest('SHA-256', hash);
      var signature = Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, '0')).join('');

      resolve(signature);
    }, 0);
  });
}

// Example usage
getBrowserSignature().then(signature => {
  logInfo(signature);
});

// Example usage
getBrowserSignature().then(signature => {
  logInfo('Test2 Browser:' + signature);
});

function getCountryCodeByTimezone(city) {
  try {
    const now = new Date();
    const options = {
      timeZone: city,
      timeZoneName: 'long',
    };
    const [timeZoneName] = new Intl.DateTimeFormat('en-US', options)
      .formatToParts(now)
      .filter((part) => part.type === 'timeZoneName');

    if (timeZoneName) {
      // Extract the country code from the timezone name
      const parts = timeZoneName.value.split('-');
      if (parts.length >= 2) {
        return parts[1];
      }
    }
  } catch (error) {
    // Handle errors, such as an invalid timezone city
    logInfo(error);
  }

  // Handle the case where the city is not found or an error occurred
  return 'Unknown';
}

function getBidFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return deepAccess(bid, 'params.bidFloor', 0);
  }

  try {
    const bidFloor = bid.getFloor({
      currency: 'USD',
      mediaType: '*',
      size: '*',
    });
    return bidFloor.floor;
  } catch (_) {
    return 0
  }
}

function readFromAllStorages(name) {
  const fromCookie = storage.getCookie(name);
  const fromLocalStorage = storage.getDataFromLocalStorage(name);

  return fromCookie || fromLocalStorage || undefined;
}

async function getapi(url) {
  // Storing response
  const response = await fetch(url);
  logInfo('DEBUG UUID ::::1122::' + response.toString);
  logInfo('DEBUG UUID ::::1122::' + response.toString);
  // Storing data in form of JSON
  var data = await response.json();
  const jsonDataString = JSON.stringify(data);
  const dataMap = new Map(Object.entries(data));

  // Log the map entries
  dataMap.forEach((value, key) => {
    logInfo(`Test 123 Map Entry - Key: ${key}, Value: ${value}`);
  });

  const uuidValue = dataMap.get('UUID');
  logInfo('debug uuid value boolean:' + !Object.is(uuidValue, null))
  if (!Object.is(uuidValue, null) && !Object.is(uuidValue, undefined)) {
    logInfo('DEBUG nonNull uuidValue:' + uuidValue);
    storage2.setDataInLocalStorage('pre_Id', uuidValue);
    logInfo('DEBUG nonNull uuidValue:' + uuidValue);
  }

  logInfo('Test uuid from local storage:' + window.localStorage.getItem('pre_Id'))
  logInfo('DEBUG UUID 123::::' + jsonDataString);
  logInfo('DEBUG uuidValue ::::' + uuidValue);

  return data;
}

registerBidder(spec);
