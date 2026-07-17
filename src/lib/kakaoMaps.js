const SCRIPT_ID = "kakao-maps-sdk";

let kakaoMapsPromise = null;

export function loadKakaoMaps(appKey) {
  if (!appKey) {
    return Promise.reject(new Error("Kakao Maps JavaScript key is not configured."));
  }

  if (window.kakao?.maps?.RoadviewClient) {
    return Promise.resolve(window.kakao.maps);
  }

  if (kakaoMapsPromise) return kakaoMapsPromise;

  const pendingPromise = new Promise((resolve, reject) => {
    const finishLoading = () => {
      if (!window.kakao?.maps?.load) {
        reject(new Error("Kakao Maps SDK did not initialize."));
        return;
      }

      window.kakao.maps.load(() => {
        if (!window.kakao?.maps?.RoadviewClient) {
          reject(new Error("Kakao Roadview API is unavailable."));
          return;
        }
        resolve(window.kakao.maps);
      });
    };

    const existingScript = document.getElementById(SCRIPT_ID);
    if (existingScript) {
      if (window.kakao?.maps?.load) {
        finishLoading();
        return;
      }
      existingScript.addEventListener("load", finishLoading, { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Kakao Maps SDK failed to load.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false`;
    script.async = true;
    script.addEventListener("load", finishLoading, { once: true });
    script.addEventListener("error", () => {
      script.remove();
      reject(new Error("Kakao Maps SDK failed to load."));
    }, { once: true });
    document.head.appendChild(script);
  });

  kakaoMapsPromise = pendingPromise.catch((error) => {
    kakaoMapsPromise = null;
    throw error;
  });

  return kakaoMapsPromise;
}
