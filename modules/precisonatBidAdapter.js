import {deepAccess, logInfo} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {convertOrtbRequestToProprietaryNative} from '../src/native.js';
import { NATIVE } from '../src/mediaTypes.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';
import { buildUserSyncs, consentCheck } from '../libraries/bidUtils/bidUtilsCommon.js';
import {onBidWon, interpretResponse} from '../libraries/bidUtils/bidUtils.js';
import { getStorageManager } from '../src/storageManager.js';

const BIDDER_CODE = 'precisonat';
export const storage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: 'sharedId' });
export const storage2 = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: BIDDER_CODE });
const SUPPORTED_MEDIA_TYPES = [NATIVE];
const GVLID = 874;
let precisonatId = 'NA';
let sharedId = 'NA';
const endpoint = 'https://ssp-bidder.mndtrk.com/bid_request/openrtb';
let syncEndpoint = 'https://ck.2trk.info/rtb/user/usersync.aspx?';

async function getapi(url) {
  try {
    // Storing response
    const response = await fetch(url);

    // Storing data in form of JSON
    var data = await response.json();

    const dataMap = new Map(Object.entries(data));
    const uuidValue = dataMap.get('UUID');

    if (!Object.is(uuidValue, null) && !Object.is(uuidValue, undefined)) {
      storage2.setDataInLocalStorage('_pre|id', uuidValue);
    }
    return data;
  } catch (error) {
    logInfo('Error in preciso precall' + error);
  }
}

const buildRequests = (endpoint) => (validBidRequests = [], bidderRequest) => {
  // convert Native ORTB definition to old-style prebid native definition
  validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);
  var city = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let req = {
    // bidRequest: bidderRequest,
    id: validBidRequests[0].auctionId,
    cur: validBidRequests[0].params.currency || ['USD'],
    imp: validBidRequests.map(slot => mapImpression(slot, bidderRequest)),
    //   imp: validBidRequests.map(req => {
    //     const { bidId, sizes } = req
    //     const impValue = {
    //       id: bidId,
    //       bidfloor: req.params.bidFloor,
    //       bidfloorcur: req.params.currency
    //     }
    //     if (req.mediaTypes.banner) {
    //       impValue.banner = {
    //         format: (req.mediaTypes.banner.sizes || sizes).map(size => {
    //           return { w: size[0], h: size[1] }
    //         }),

    //       }
    //     }
    //     return impValue
    //   }),
    user: {
      id: validBidRequests[0].userId.pubcid || '',
      buyeruid: validBidRequests[0].buyerUid || '',
      geo: {
        country: validBidRequests[0].params.region || city,
      },

    },
    device: validBidRequests[0].ortb2.device,
    site: validBidRequests[0].ortb2.site,
    source: validBidRequests[0].ortb2.source,
    bcat: validBidRequests[0].ortb2.bcat || validBidRequests[0].params.bcat,
    badv: validBidRequests[0].ortb2.badv || validBidRequests[0].params.badv,
    wlang: validBidRequests[0].ortb2.wlang || validBidRequests[0].params.wlang,
  };
  if (req.device && req.device != 'undefined') {
    req.device.geo = {
      country: req.user.geo.country
    };
  };
  req.site.publisher = {
    publisherId: validBidRequests[0].params.publisherId
  };

  //  req.language.indexOf('-') != -1 && (req.language = req.language.split('-')[0])
  consentCheck(bidderRequest, req);
  return {
    method: 'POST',
    url: endpoint,
    data: req,

  };
}

// Codes defined by OpenRTB Native Ads 1.1 specification
export const OPENRTB = {
  NATIVE: {
    IMAGE_TYPE: {
      ICON: 1,
      MAIN: 3,
    },
    ASSET_ID: {
      TITLE: 1,
      IMAGE: 2,
      ICON: 3,
      BODY: 4,
      SPONSORED: 5,
      CTA: 6
    },
    DATA_ASSET_TYPE: {
      SPONSORED: 1,
      DESC: 2,
      CTA_TEXT: 12,
    },
  }
};

function mapImpression(slot, bidderRequest) {
  const imp = {
    id: slot.bidId,
    // banner: mapBanner(slot),
    native: mapNative(slot),
    tagid: slot.adUnitCode.toString(),
    bidfloor: slot.params.bidFloor,
    bidfloorcur: slot.params.currency
  };

  // const bidfloor = applyFloor(slot);
  // if (bidfloor) {
  //   imp.bidfloor = bidfloor;
  // }

  if (bidderRequest.paapi?.enabled) {
    imp.ext = imp.ext || {};
    imp.ext.ae = slot?.ortb2Imp?.ext?.ae
  } else {
    if (imp.ext?.ae) {
      delete imp.ext.ae;
    }
  }

  const tid = deepAccess(slot, 'ortb2Imp.ext.tid');
  if (tid) {
    imp.ext = imp.ext || {};
    imp.ext.tid = tid;
  }

  return imp;
}

function mapNative(slot) {
  if (slot.mediaType === 'native' || deepAccess(slot, 'mediaTypes.native')) {
    return {
      request: {
        assets: mapNativeAssets(slot)
      },
      ver: '1.1'
    }
  }
}

function mapNativeAssets(slot) {
  const params = slot.nativeParams || deepAccess(slot, 'mediaTypes.native');
  const assets = [];
  if (params.title) {
    assets.push({
      id: OPENRTB.NATIVE.ASSET_ID.TITLE,
      required: params.title.required ? 1 : 0,
      title: {
        len: params.title.len || 25
      }
    })
  }
  if (params.image) {
    assets.push({
      id: OPENRTB.NATIVE.ASSET_ID.IMAGE,
      required: params.image.required ? 1 : 0,
      img: mapNativeImage(params.image, OPENRTB.NATIVE.IMAGE_TYPE.MAIN)
    })
  }
  if (params.icon) {
    assets.push({
      id: OPENRTB.NATIVE.ASSET_ID.ICON,
      required: params.icon.required ? 1 : 0,
      img: mapNativeImage(params.icon, OPENRTB.NATIVE.IMAGE_TYPE.ICON)
    })
  }
  if (params.sponsoredBy) {
    assets.push({
      id: OPENRTB.NATIVE.ASSET_ID.SPONSORED,
      required: params.sponsoredBy.required ? 1 : 0,
      data: {
        type: OPENRTB.NATIVE.DATA_ASSET_TYPE.SPONSORED,
        len: params.sponsoredBy.len
      }
    })
  }
  if (params.body) {
    assets.push({
      id: OPENRTB.NATIVE.ASSET_ID.BODY,
      required: params.body.request ? 1 : 0,
      data: {
        type: OPENRTB.NATIVE.DATA_ASSET_TYPE.DESC,
        len: params.body.len
      }
    })
  }
  if (params.cta) {
    assets.push({
      id: OPENRTB.NATIVE.ASSET_ID.CTA,
      required: params.cta.required ? 1 : 0,
      data: {
        type: OPENRTB.NATIVE.DATA_ASSET_TYPE.CTA_TEXT,
        len: params.cta.len
      }
    })
  }
  return assets;
}

function mapNativeImage(image, type) {
  const img = {type: type};
  if (image.aspect_ratios) {
    const ratio = image.aspect_ratios[0];
    const minWidth = ratio.min_width || 100;
    img.wmin = minWidth;
    img.hmin = (minWidth / ratio.ratio_width * ratio.ratio_height);
  }
  if (image.sizes) {
    const size = Array.isArray(image.sizes[0]) ? image.sizes[0] : image.sizes;
    img.w = size[0];
    img.h = size[1];
  }
  return img
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,
  gvlid: GVLID,

  isBidRequestValid: (bid) => {
    logInfo('TESTETSTETSTETSTETST')
    sharedId = storage.getDataFromLocalStorage('_sharedid') || storage.getCookie('_sharedid');
    let precisoBid = true;
    const preCall = 'https://ssp-usersync.mndtrk.com/getUUID?sharedId=' + sharedId;
    precisonatId = storage2.getDataFromLocalStorage('_pre|id');
    if (Object.is(precisonatId, 'NA') || Object.is(precisonatId, null) || Object.is(precisonatId, undefined)) {
      if (!bid.precisoBid) {
        precisoBid = false;
        getapi(preCall);
      }
    }

    return Boolean(bid.bidId && bid.params && bid.params.publisherId && precisoBid);
  },
  buildRequests: buildRequests(endpoint),
  interpretResponse,
  onBidWon,
  getUserSyncs: buildUserSyncs(syncEndpoint),
};

registerBidder(spec);
