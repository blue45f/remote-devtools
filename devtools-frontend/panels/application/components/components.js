var Gt=Object.defineProperty;var f=(t,e)=>{for(var a in e)Gt(t,a,{get:e[a],enumerable:!0})};var tt={};f(tt,{BackForwardCacheView:()=>ye});import"./../../../ui/components/expandable_list/expandable_list.js";import"./../../../ui/components/report_view/report_view.js";import"./../../../ui/legacy/legacy.js";import"./../../../ui/kit/kit.js";import*as Ze from"./../../../core/common/common.js";import*as Se from"./../../../core/i18n/i18n.js";import*as p from"./../../../core/sdk/sdk.js";import"./../../../ui/components/buttons/buttons.js";import*as et from"./../../../ui/legacy/components/utils/utils.js";import*as X from"./../../../ui/legacy/legacy.js";import{html as g,nothing as T,render as Xt}from"./../../../ui/lit/lit.js";import*as S from"./../../../ui/visual_logging/visual_logging.js";import*as m from"./../../../core/i18n/i18n.js";var o={notMainFrame:"Navigation happened in a frame other than the main frame.",backForwardCacheDisabled:"Back/forward cache is disabled by flags. Visit chrome://flags/#back-forward-cache to enable it locally on this device.",relatedActiveContentsExist:"The page was opened using '`window.open()`' and another tab has a reference to it, or the page opened a window.",HTTPStatusNotOK:"Only pages with a status code of 2XX can be cached.",schemeNotHTTPOrHTTPS:"Only pages whose URL scheme is HTTP / HTTPS can be cached.",loading:"The page did not finish loading before navigating away.",wasGrantedMediaAccess:"Pages that have granted access to record video or audio are not currently eligible for back/forward cache.",HTTPMethodNotGET:"Only pages loaded via a GET request are eligible for back/forward cache.",subframeIsNavigating:"An iframe on the page started a navigation that did not complete.",timeout:"The page exceeded the maximum time in back/forward cache and was expired.",cacheLimit:"The page was evicted from the cache to allow another page to be cached.",JavaScriptExecution:"Chrome detected an attempt to execute JavaScript while in the cache.",rendererProcessKilled:"The renderer process for the page in back/forward cache was killed.",rendererProcessCrashed:"The renderer process for the page in back/forward cache crashed.",grantedMediaStreamAccess:"Pages that have granted media stream access are not currently eligible for back/forward cache.",cacheFlushed:"The cache was intentionally cleared.",serviceWorkerVersionActivation:"The page was evicted from back/forward cache due to a service worker activation.",sessionRestored:"Chrome restarted and cleared the back/forward cache entries.",serviceWorkerPostMessage:"A service worker attempted to send the page in back/forward cache a `MessageEvent`.",enteredBackForwardCacheBeforeServiceWorkerHostAdded:"A service worker was activated while the page was in back/forward cache.",serviceWorkerClaim:"The page was claimed by a service worker while it is in back/forward cache.",haveInnerContents:"Pages that have certain kinds of embedded content (e.g. PDFs) are not currently eligible for back/forward cache.",timeoutPuttingInCache:"The page timed out entering back/forward cache (likely due to long-running pagehide handlers).",backForwardCacheDisabledByLowMemory:"Back/forward cache is disabled due to insufficient memory.",backForwardCacheDisabledByCommandLine:"Back/forward cache is disabled by the command line.",networkRequestDatapipeDrainedAsBytesConsumer:"Pages that have inflight fetch() or XHR are not currently eligible for back/forward cache.",networkRequestRedirected:"The page was evicted from back/forward cache because an active network request involved a redirect.",networkRequestTimeout:"The page was evicted from the cache because a network connection was open too long. Chrome limits the amount of time that a page may receive data while cached.",networkExceedsBufferLimit:"The page was evicted from the cache because an active network connection received too much data. Chrome limits the amount of data that a page may receive while cached.",navigationCancelledWhileRestoring:"Navigation was cancelled before the page could be restored from back/forward cache.",backForwardCacheDisabledForPrerender:"Back/forward cache is disabled for prerenderer.",userAgentOverrideDiffers:"Browser has changed the user agent override header.",foregroundCacheLimit:"The page was evicted from the cache to allow another page to be cached.",backForwardCacheDisabledForDelegate:"Back/forward cache is not supported by delegate.",unloadHandlerExistsInMainFrame:"The page has an unload handler in the main frame.",unloadHandlerExistsInSubFrame:"The page has an unload handler in a sub frame.",serviceWorkerUnregistration:"ServiceWorker was unregistered while a page was in back/forward cache.",noResponseHead:"Pages that do not have a valid response head cannot enter back/forward cache.",cacheControlNoStore:"Pages with cache-control:no-store header cannot enter back/forward cache.",ineligibleAPI:"Ineligible APIs were used.",internalError:"Internal error.",webSocket:"Pages with WebSocket cannot enter back/forward cache.",webTransport:"Pages with WebTransport cannot enter back/forward cache.",webRTC:"Pages with WebRTC cannot enter back/forward cache.",mainResourceHasCacheControlNoStore:"Pages whose main resource has cache-control:no-store cannot enter back/forward cache.",mainResourceHasCacheControlNoCache:"Pages whose main resource has cache-control:no-cache cannot enter back/forward cache.",subresourceHasCacheControlNoStore:"Pages whose subresource has cache-control:no-store cannot enter back/forward cache.",subresourceHasCacheControlNoCache:"Pages whose subresource has cache-control:no-cache cannot enter back/forward cache.",containsPlugins:"Pages containing plugins are not currently eligible for back/forward cache.",documentLoaded:"The document did not finish loading before navigating away.",dedicatedWorkerOrWorklet:"Pages that use a dedicated worker or worklet are not currently eligible for back/forward cache.",outstandingNetworkRequestOthers:"Pages with an in-flight network request are not currently eligible for back/forward cache.",outstandingIndexedDBTransaction:"Page with ongoing indexed DB transactions are not currently eligible for back/forward cache.",requestedNotificationsPermission:"Pages that have requested notifications permissions are not currently eligible for back/forward cache.",requestedMIDIPermission:"Pages that have requested MIDI permissions are not currently eligible for back/forward cache.",requestedAudioCapturePermission:"Pages that have requested audio capture permissions are not currently eligible for back/forward cache.",requestedVideoCapturePermission:"Pages that have requested video capture permissions are not currently eligible for back/forward cache.",requestedBackForwardCacheBlockedSensors:"Pages that have requested sensor permissions are not currently eligible for back/forward cache.",requestedBackgroundWorkPermission:"Pages that have requested background sync or fetch permissions are not currently eligible for back/forward cache.",broadcastChannel:"The page cannot be cached because it has a BroadcastChannel instance with registered listeners.",indexedDBConnection:"Pages that have an open IndexedDB connection are not currently eligible for back/forward cache.",webXR:"Pages that use WebXR are not currently eligible for back/forward cache.",sharedWorker:"Pages that use SharedWorker are not currently eligible for back/forward cache.",sharedWorkerMessage:"The page was evicted from the cache because it received a message from a SharedWorker",webLocks:"Pages that use WebLocks are not currently eligible for back/forward cache.",webHID:"Pages that use WebHID are not currently eligible for back/forward cache.",webShare:"Pages that use WebShare are not currently eligible for back/forwad cache.",requestedStorageAccessGrant:"Pages that have requested storage access are not currently eligible for back/forward cache.",webNfc:"Pages that use WebNfc are not currently eligible for back/forwad cache.",outstandingNetworkRequestFetch:"Pages with an in-flight fetch network request are not currently eligible for back/forward cache.",outstandingNetworkRequestXHR:"Pages with an in-flight XHR network request are not currently eligible for back/forward cache.",appBanner:"Pages that requested an AppBanner are not currently eligible for back/forward cache.",printing:"Pages that show Printing UI are not currently eligible for back/forward cache.",webDatabase:"Pages that use WebDatabase are not currently eligible for back/forward cache.",pictureInPicture:"Pages that use Picture-in-Picture are not currently eligible for back/forward cache.",speechRecognizer:"Pages that use SpeechRecognizer are not currently eligible for back/forward cache.",idleManager:"Pages that use IdleManager are not currently eligible for back/forward cache.",paymentManager:"Pages that use PaymentManager are not currently eligible for back/forward cache.",speechSynthesis:"Pages that use SpeechSynthesis are not currently eligible for back/forward cache.",keyboardLock:"Pages that use Keyboard lock are not currently eligible for back/forward cache.",webOTPService:"Pages that use WebOTPService are not currently eligible for bfcache.",outstandingNetworkRequestDirectSocket:"Pages with an in-flight network request are not currently eligible for back/forward cache.",injectedJavascript:"Pages that `JavaScript` is injected into by extensions are not currently eligible for back/forward cache.",injectedStyleSheet:"Pages that a `StyleSheet` is injected into by extensions are not currently eligible for back/forward cache.",contentDiscarded:"Undefined",contentSecurityHandler:"Pages that use SecurityHandler are not eligible for back/forward cache.",contentWebAuthenticationAPI:"Pages that use WebAuthetication API are not eligible for back/forward cache.",contentFileChooser:"Pages that use FileChooser API are not eligible for back/forward cache.",contentSerial:"Pages that use Serial API are not eligible for back/forward cache.",contentFileSystemAccess:"Pages that use File System Access API are not eligible for back/forward cache.",contentMediaDevicesDispatcherHost:"Pages that use Media Device Dispatcher are not eligible for back/forward cache.",contentWebBluetooth:"Pages that use WebBluetooth API are not eligible for back/forward cache.",contentWebUSB:"Pages that use WebUSB API are not eligible for back/forward cache.",contentMediaSession:"Pages that use MediaSession API and set a playback state are not eligible for back/forward cache.",contentMediaSessionService:"Pages that use MediaSession API and set action handlers are not eligible for back/forward cache.",contentMediaPlay:"A media player was playing upon navigating away.",contentScreenReader:"Back/forward cache is disabled due to screen reader.",embedderPopupBlockerTabHelper:"Popup blocker was present upon navigating away.",embedderSafeBrowsingTriggeredPopupBlocker:"Safe Browsing considered this page to be abusive and blocked popup.",embedderSafeBrowsingThreatDetails:"Safe Browsing details were shown upon navigating away.",embedderAppBannerManager:"App Banner was present upon navigating away.",embedderDomDistillerViewerSource:"DOM Distiller Viewer was present upon navigating away.",embedderDomDistillerSelfDeletingRequestDelegate:"DOM distillation was in progress upon navigating away.",embedderOomInterventionTabHelper:"Out-Of-Memory Intervention bar was present upon navigating away.",embedderOfflinePage:"The offline page was shown upon navigating away.",embedderChromePasswordManagerClientBindCredentialManager:"Chrome Password Manager was present upon navigating away.",embedderPermissionRequestManager:"There were permission requests upon navigating away.",embedderModalDialog:"Modal dialog such as form resubmission or http password dialog was shown for the page upon navigating away.",embedderExtensions:"Back/forward cache is disabled due to extensions.",embedderExtensionMessaging:"Back/forward cache is disabled due to extensions using messaging API.",embedderExtensionMessagingForOpenPort:"Extensions with long-lived connection should close the connection before entering back/forward cache.",embedderExtensionSentMessageToCachedFrame:"Extensions with long-lived connection attempted to send messages to frames in back/forward cache.",errorDocument:"Back/forward cache is disabled due to a document error.",fencedFramesEmbedder:"Pages using FencedFrames cannot be stored in bfcache.",keepaliveRequest:"Back/forward cache is disabled due to a keepalive request.",jsNetworkRequestReceivedCacheControlNoStoreResource:"Back/forward cache is disabled because some JavaScript network request received resource with `Cache-Control: no-store` header.",indexedDBEvent:"Back/forward cache is disabled due to an IndexedDB event.",cookieDisabled:"Back/forward cache is disabled because cookies are disabled on a page that uses `Cache-Control: no-store`.",webRTCUsedWithCCNS:"Back/forward cache is disabled because WebRTC has been used.",webTransportUsedWithCCNS:"Back/forward cache is disabled because WebTransport has been used.",webSocketUsedWithCCNS:"Back/forward cache is disabled because WebSocket has been used."},Jt=m.i18n.registerUIStrings("panels/application/components/BackForwardCacheStrings.ts",o),r=m.i18n.getLazilyComputedLocalizedString.bind(void 0,Jt),we={NotPrimaryMainFrame:{name:r(o.notMainFrame)},BackForwardCacheDisabled:{name:r(o.backForwardCacheDisabled)},RelatedActiveContentsExist:{name:r(o.relatedActiveContentsExist)},HTTPStatusNotOK:{name:r(o.HTTPStatusNotOK)},SchemeNotHTTPOrHTTPS:{name:r(o.schemeNotHTTPOrHTTPS)},Loading:{name:r(o.loading)},WasGrantedMediaAccess:{name:r(o.wasGrantedMediaAccess)},HTTPMethodNotGET:{name:r(o.HTTPMethodNotGET)},SubframeIsNavigating:{name:r(o.subframeIsNavigating)},Timeout:{name:r(o.timeout)},CacheLimit:{name:r(o.cacheLimit)},JavaScriptExecution:{name:r(o.JavaScriptExecution)},RendererProcessKilled:{name:r(o.rendererProcessKilled)},RendererProcessCrashed:{name:r(o.rendererProcessCrashed)},GrantedMediaStreamAccess:{name:r(o.grantedMediaStreamAccess)},CacheFlushed:{name:r(o.cacheFlushed)},ServiceWorkerVersionActivation:{name:r(o.serviceWorkerVersionActivation)},SessionRestored:{name:r(o.sessionRestored)},ServiceWorkerPostMessage:{name:r(o.serviceWorkerPostMessage)},EnteredBackForwardCacheBeforeServiceWorkerHostAdded:{name:r(o.enteredBackForwardCacheBeforeServiceWorkerHostAdded)},ServiceWorkerClaim:{name:r(o.serviceWorkerClaim)},HaveInnerContents:{name:r(o.haveInnerContents)},TimeoutPuttingInCache:{name:r(o.timeoutPuttingInCache)},BackForwardCacheDisabledByLowMemory:{name:r(o.backForwardCacheDisabledByLowMemory)},BackForwardCacheDisabledByCommandLine:{name:r(o.backForwardCacheDisabledByCommandLine)},NetworkRequestDatapipeDrainedAsBytesConsumer:{name:r(o.networkRequestDatapipeDrainedAsBytesConsumer)},NetworkRequestRedirected:{name:r(o.networkRequestRedirected)},NetworkRequestTimeout:{name:r(o.networkRequestTimeout)},NetworkExceedsBufferLimit:{name:r(o.networkExceedsBufferLimit)},NavigationCancelledWhileRestoring:{name:r(o.navigationCancelledWhileRestoring)},BackForwardCacheDisabledForPrerender:{name:r(o.backForwardCacheDisabledForPrerender)},UserAgentOverrideDiffers:{name:r(o.userAgentOverrideDiffers)},ForegroundCacheLimit:{name:r(o.foregroundCacheLimit)},BackForwardCacheDisabledForDelegate:{name:r(o.backForwardCacheDisabledForDelegate)},UnloadHandlerExistsInMainFrame:{name:r(o.unloadHandlerExistsInMainFrame)},UnloadHandlerExistsInSubFrame:{name:r(o.unloadHandlerExistsInSubFrame)},ServiceWorkerUnregistration:{name:r(o.serviceWorkerUnregistration)},NoResponseHead:{name:r(o.noResponseHead)},CacheControlNoStore:{name:r(o.cacheControlNoStore)},CacheControlNoStoreCookieModified:{name:r(o.cacheControlNoStore)},CacheControlNoStoreHTTPOnlyCookieModified:{name:r(o.cacheControlNoStore)},DisableForRenderFrameHostCalled:{name:r(o.ineligibleAPI)},BlocklistedFeatures:{name:r(o.ineligibleAPI)},SchedulerTrackedFeatureUsed:{name:r(o.ineligibleAPI)},DomainNotAllowed:{name:r(o.internalError)},ConflictingBrowsingInstance:{name:r(o.internalError)},NotMostRecentNavigationEntry:{name:r(o.internalError)},IgnoreEventAndEvict:{name:r(o.internalError)},BrowsingInstanceNotSwapped:{name:r(o.internalError)},ActivationNavigationsDisallowedForBug1234857:{name:r(o.internalError)},Unknown:{name:r(o.internalError)},RenderFrameHostReused_SameSite:{name:r(o.internalError)},RenderFrameHostReused_CrossSite:{name:r(o.internalError)},WebSocket:{name:r(o.webSocket)},WebTransport:{name:r(o.webTransport)},WebRTC:{name:r(o.webRTC)},MainResourceHasCacheControlNoStore:{name:r(o.mainResourceHasCacheControlNoStore)},MainResourceHasCacheControlNoCache:{name:r(o.mainResourceHasCacheControlNoCache)},SubresourceHasCacheControlNoStore:{name:r(o.subresourceHasCacheControlNoStore)},SubresourceHasCacheControlNoCache:{name:r(o.subresourceHasCacheControlNoCache)},ContainsPlugins:{name:r(o.containsPlugins)},DocumentLoaded:{name:r(o.documentLoaded)},DedicatedWorkerOrWorklet:{name:r(o.dedicatedWorkerOrWorklet)},OutstandingNetworkRequestOthers:{name:r(o.outstandingNetworkRequestOthers)},OutstandingIndexedDBTransaction:{name:r(o.outstandingIndexedDBTransaction)},RequestedNotificationsPermission:{name:r(o.requestedNotificationsPermission)},RequestedMIDIPermission:{name:r(o.requestedMIDIPermission)},RequestedAudioCapturePermission:{name:r(o.requestedAudioCapturePermission)},RequestedVideoCapturePermission:{name:r(o.requestedVideoCapturePermission)},RequestedBackForwardCacheBlockedSensors:{name:r(o.requestedBackForwardCacheBlockedSensors)},RequestedBackgroundWorkPermission:{name:r(o.requestedBackgroundWorkPermission)},BroadcastChannel:{name:r(o.broadcastChannel)},IndexedDBConnection:{name:r(o.indexedDBConnection)},WebXR:{name:r(o.webXR)},SharedWorker:{name:r(o.sharedWorker)},SharedWorkerMessage:{name:r(o.sharedWorkerMessage)},WebLocks:{name:r(o.webLocks)},WebHID:{name:r(o.webHID)},WebShare:{name:r(o.webShare)},RequestedStorageAccessGrant:{name:r(o.requestedStorageAccessGrant)},WebNfc:{name:r(o.webNfc)},OutstandingNetworkRequestFetch:{name:r(o.outstandingNetworkRequestFetch)},OutstandingNetworkRequestXHR:{name:r(o.outstandingNetworkRequestXHR)},AppBanner:{name:r(o.appBanner)},Printing:{name:r(o.printing)},WebDatabase:{name:r(o.webDatabase)},PictureInPicture:{name:r(o.pictureInPicture)},SpeechRecognizer:{name:r(o.speechRecognizer)},IdleManager:{name:r(o.idleManager)},PaymentManager:{name:r(o.paymentManager)},SpeechSynthesis:{name:r(o.speechSynthesis)},KeyboardLock:{name:r(o.keyboardLock)},WebOTPService:{name:r(o.webOTPService)},OutstandingNetworkRequestDirectSocket:{name:r(o.outstandingNetworkRequestDirectSocket)},InjectedJavascript:{name:r(o.injectedJavascript)},InjectedStyleSheet:{name:r(o.injectedStyleSheet)},Dummy:{name:r(o.internalError)},ContentDiscarded:{name:r(o.contentDiscarded)},ContentSecurityHandler:{name:r(o.contentSecurityHandler)},ContentWebAuthenticationAPI:{name:r(o.contentWebAuthenticationAPI)},ContentFileChooser:{name:r(o.contentFileChooser)},ContentSerial:{name:r(o.contentSerial)},ContentFileSystemAccess:{name:r(o.contentFileSystemAccess)},ContentMediaDevicesDispatcherHost:{name:r(o.contentMediaDevicesDispatcherHost)},ContentWebBluetooth:{name:r(o.contentWebBluetooth)},ContentWebUSB:{name:r(o.contentWebUSB)},ContentMediaSession:{name:r(o.contentMediaSession)},ContentMediaSessionService:{name:r(o.contentMediaSessionService)},ContentMediaPlay:{name:r(o.contentMediaPlay)},ContentScreenReader:{name:r(o.contentScreenReader)},EmbedderPopupBlockerTabHelper:{name:r(o.embedderPopupBlockerTabHelper)},EmbedderSafeBrowsingTriggeredPopupBlocker:{name:r(o.embedderSafeBrowsingTriggeredPopupBlocker)},EmbedderSafeBrowsingThreatDetails:{name:r(o.embedderSafeBrowsingThreatDetails)},EmbedderAppBannerManager:{name:r(o.embedderAppBannerManager)},EmbedderDomDistillerViewerSource:{name:r(o.embedderDomDistillerViewerSource)},EmbedderDomDistillerSelfDeletingRequestDelegate:{name:r(o.embedderDomDistillerSelfDeletingRequestDelegate)},EmbedderOomInterventionTabHelper:{name:r(o.embedderOomInterventionTabHelper)},EmbedderOfflinePage:{name:r(o.embedderOfflinePage)},EmbedderChromePasswordManagerClientBindCredentialManager:{name:r(o.embedderChromePasswordManagerClientBindCredentialManager)},EmbedderPermissionRequestManager:{name:r(o.embedderPermissionRequestManager)},EmbedderModalDialog:{name:r(o.embedderModalDialog)},EmbedderExtensions:{name:r(o.embedderExtensions)},EmbedderExtensionMessaging:{name:r(o.embedderExtensionMessaging)},EmbedderExtensionMessagingForOpenPort:{name:r(o.embedderExtensionMessagingForOpenPort)},EmbedderExtensionSentMessageToCachedFrame:{name:r(o.embedderExtensionSentMessageToCachedFrame)},ErrorDocument:{name:r(o.errorDocument)},FencedFramesEmbedder:{name:r(o.fencedFramesEmbedder)},KeepaliveRequest:{name:r(o.keepaliveRequest)},JsNetworkRequestReceivedCacheControlNoStoreResource:{name:r(o.jsNetworkRequestReceivedCacheControlNoStoreResource)},IndexedDBEvent:{name:r(o.indexedDBEvent)},CookieDisabled:{name:r(o.cookieDisabled)},WebRTCUsedWithCCNS:{name:r(o.webRTCUsedWithCCNS)},WebTransportUsedWithCCNS:{name:r(o.webTransportUsedWithCCNS)},WebSocketUsedWithCCNS:{name:r(o.webSocketUsedWithCCNS)},HTTPAuthRequired:{name:m.i18n.lockedLazyString("HTTPAuthRequired")},CookieFlushed:{name:m.i18n.lockedLazyString("CookieFlushed")},SmartCard:{name:m.i18n.lockedLazyString("SmartCard")},LiveMediaStreamTrack:{name:m.i18n.lockedLazyString("LiveMediaStreamTrack")},UnloadHandler:{name:m.i18n.lockedLazyString("UnloadHandler")},ParserAborted:{name:m.i18n.lockedLazyString("ParserAborted")},BroadcastChannelOnMessage:{name:m.i18n.lockedLazyString("BroadcastChannelOnMessage")},RequestedByWebViewClient:{name:m.i18n.lockedLazyString("RequestedByWebViewClient")},PostMessageByWebViewClient:{name:m.i18n.lockedLazyString("PostMessageByWebViewClient")},WebViewSettingsChanged:{name:m.i18n.lockedLazyString("WebViewSettingsChanged")},WebViewJavaScriptObjectChanged:{name:m.i18n.lockedLazyString("WebViewJavaScriptObjectChanged")},WebViewMessageListenerInjected:{name:m.i18n.lockedLazyString("WebViewMessageListenerInjected")},WebViewSafeBrowsingAllowlistChanged:{name:m.i18n.lockedLazyString("WebViewSafeBrowsingAllowlistChanged")},WebViewDocumentStartJavascriptChanged:{name:m.i18n.lockedLazyString("WebViewDocumentStartJavascriptChanged")},CacheControlNoStoreDeviceBoundSessionTerminated:{name:r(o.cacheControlNoStore)},CacheLimitPrunedOnModerateMemoryPressure:{name:m.i18n.lockedLazyString("CacheLimitPrunedOnModerateMemoryPressure")},CacheLimitPrunedOnCriticalMemoryPressure:{name:m.i18n.lockedLazyString("CacheLimitPrunedOnCriticalMemoryPressure")}};var Qe=`devtools-report-value{overflow:hidden}.inline-icon{vertical-align:sub}.gray-text{color:var(--sys-color-token-subtle);margin:0 0 5px 56px;display:flex;flex-direction:row;align-items:center;flex:auto;overflow-wrap:break-word;overflow:hidden;grid-column-start:span 2}.details-list{margin-left:56px;grid-column-start:span 2}.help-outline-icon{margin:0 2px}.circled-exclamation-icon{margin-right:10px;flex-shrink:0}.status{margin-right:11px;flex-shrink:0}.report-line{grid-column-start:span 2;display:flex;align-items:center;margin:0 30px;line-height:26px}.report-key{color:var(--sys-color-token-subtle);min-width:auto;overflow-wrap:break-word;align-self:start}.report-value{padding:0 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.link,
.devtools-link{color:var(--sys-color-primary);text-decoration:underline;cursor:pointer;outline-offset:2px}devtools-report-value:has(devtools-tree-outline){margin-left:var(--sys-size-7)}.cache-status-section:focus-visible{outline:0}.tree-outline li .selection{margin-left:-5px}@media (forced-colors: active){.link,
  .devtools-link{color:linktext;text-decoration-color:linktext}}
/*# sourceURL=${import.meta.resolve("./backForwardCacheView.css")} */`;var l={mainFrame:"Main Frame",backForwardCacheTitle:"Back/forward cache",unavailable:"unavailable",url:"URL",unknown:"Unknown Status",normalNavigation:"Not served from back/forward cache: to trigger back/forward cache, use Chrome's back/forward buttons, or use the test button below to automatically navigate away and back.",restoredFromBFCache:"Successfully served from back/forward cache.",pageSupportNeeded:"Actionable",testCompleted:"Back/forward cache test completed.",pageSupportNeededExplanation:"These reasons are actionable i.e. they can be cleaned up to make the page eligible for back/forward cache.",circumstantial:"Not Actionable",circumstantialExplanation:"These reasons are not actionable i.e. caching was prevented by something outside of the direct control of the page.",supportPending:"Pending Support",runTest:"Test back/forward cache",runningTest:"Running test",learnMore:"Learn more: back/forward cache eligibility",neverUseUnload:"Learn more: Never use unload handler",supportPendingExplanation:"Chrome support for these reasons is pending i.e. they will not prevent the page from being eligible for back/forward cache in a future version of Chrome.",blockingExtensionId:"Extension id: ",framesTitle:"Frames",issuesInSingleFrame:"{n, plural, =1 {# issue found in 1 frame.} other {# issues found in 1 frame.}}",issuesInMultipleFrames:"{n, plural, =1 {# issue found in {m} frames.} other {# issues found in {m} frames.}}",framesPerIssue:"{n, plural, =1 {# frame} other {# frames}}",blankURLTitle:"Blank URL [{PH1}]",filesPerIssue:"{n, plural, =1 {# file} other {# files}}"},Yt=Se.i18n.registerUIStrings("panels/application/components/BackForwardCacheView.ts",l),c=Se.i18n.getLocalizedString.bind(void 0,Yt),{widget:Qt}=X.Widget;function Zt(t,e,a,n,i){if(!t)return g`
      <devtools-report-key>
        ${c(l.mainFrame)}
      </devtools-report-key>
      <devtools-report-value>
        ${c(l.unavailable)}
      </devtools-report-value>`;let s=n==="Running",d=Ze.ParsedURL.schemeIs(t.url,"devtools:");return g`
    ${to(t.backForwardCacheDetails.restoredFromCache)}
    <devtools-report-key>${c(l.url)}</devtools-report-key>
    <devtools-report-value>${t.url}</devtools-report-value>
    ${eo(e)}
    <devtools-report-section>
      <devtools-button
        aria-label=${c(l.runTest)}
        .disabled=${s||d}
        .spinner=${s}
        .variant=${"primary"}
        @click=${i}
        jslog=${S.action("back-forward-cache.run-test").track({click:!0})}>
        ${s?g`
          ${c(l.runningTest)}`:`
          ${c(l.runTest)}
        `}
      </devtools-button>
    </devtools-report-section>
    <devtools-report-divider>
    </devtools-report-divider>
    ${oo(t.backForwardCacheDetails.explanations,t.backForwardCacheDetails.explanationsTree,a)}
    <devtools-report-section>
      <devtools-link href="https://web.dev/bfcache/" class="link"
      jslogcontext="learn-more.eligibility">
        ${c(l.learnMore)}
      </devtools-link>
    </devtools-report-section>`}function eo(t){if(!t||t.frameCount===0&&t.issueCount===0)return T;function e(n){return g`
      <li role="treeitem" class="text-ellipsis">
        ${n.iconName?g`
          <devtools-icon class="inline-icon extra-large" .name=${n.iconName} style="margin-bottom: -3px;">
          </devtools-icon>
        `:T}
        ${n.text}
        ${n.children?.length?g`
          <ul role="group">
            ${n.children.map(i=>e(i))}
          </ul>`:T}
      </li>`}let a="";return t.frameCount===1?a=c(l.issuesInSingleFrame,{n:t.issueCount}):a=c(l.issuesInMultipleFrames,{n:t.issueCount,m:t.frameCount}),g`
    <devtools-report-key jslog=${S.section("frames")}>${c(l.framesTitle)}</devtools-report-key>
    <devtools-report-value>
      <devtools-tree .template=${g`
        <ul role="tree">
          <li role="treeitem" class="text-ellipsis">
            ${a}
            <ul role="group">
              ${e(t.node)}
            </ul>
          </li>
        </ul>
      `}>
      </devtools-tree>
    </devtools-report-value>`}function to(t){switch(t){case!0:return g`
        <devtools-report-section autofocus tabindex="-1">
          <div class="status extra-large">
            <devtools-icon class="inline-icon extra-large" name="check-circle" style="color: var(--icon-checkmark-green);">
            </devtools-icon>
          </div>
          ${c(l.restoredFromBFCache)}
        </devtools-report-section>`;case!1:return g`
        <devtools-report-section autofocus tabindex="-1">
          <div class="status">
            <devtools-icon class="inline-icon extra-large" name="clear">
            </devtools-icon>
          </div>
          ${c(l.normalNavigation)}
        </devtools-report-section>`}return g`
    <devtools-report-section autofocus tabindex="-1">
      ${c(l.unknown)}
    </devtools-report-section>`}function oo(t,e,a){if(t.length===0)return T;let n=t.filter(d=>d.type==="PageSupportNeeded"),i=t.filter(d=>d.type==="SupportPending"),s=t.filter(d=>d.type==="Circumstantial");return g`
    ${ke(c(l.pageSupportNeeded),c(l.pageSupportNeededExplanation),n,a)}
    ${ke(c(l.supportPending),c(l.supportPendingExplanation),i,a)}
    ${ke(c(l.circumstantial),c(l.circumstantialExplanation),s,a)}`}function ke(t,e,a,n){return g`
    ${a.length>0?g`
      <devtools-report-section-header>
        ${t}
        <div class="help-outline-icon">
          <devtools-icon class="inline-icon medium" name="help" title=${e}>
          </devtools-icon>
        </div>
      </devtools-report-section-header>
      ${a.map(i=>so(i,n.get(i.reason)))}
    `:T}`}function ro(t){if(t.reason==="EmbedderExtensionSentMessageToCachedFrame"&&t.context){let e="chrome://extensions/?id="+t.context;return g`${c(l.blockingExtensionId)}
      <devtools-link .href=${e}>${t.context}</devtools-link>`}return T}function ao(t){if(t===void 0||t.length===0)return T;let e=[g`<div>${c(l.framesPerIssue,{n:t.length})}</div>`];return e.push(...t.map(a=>g`<div class="text-ellipsis" title=${a}
    jslog=${S.treeItem().track({resize:!0})}>${a}</div>`)),g`
      <div class="details-list"
      jslog=${S.tree("frames-per-issue")}>
        <devtools-expandable-list .data=${{rows:e,title:c(l.framesPerIssue,{n:t.length})}}
        jslog=${S.treeItem().track({resize:!0})}></devtools-expandable-list>
      </div>
    `}function no(t){return t.reason==="UnloadHandlerExistsInMainFrame"||t.reason==="UnloadHandlerExistsInSubFrame"?g`
        <devtools-link href="https://web.dev/bfcache/#never-use-the-unload-event" class="link"
        jslogContext=${"learn-more.never-use-unload"}>
          ${c(l.neverUseUnload)}
        </devtools-link>`:T}function io(t){if(t===void 0||t.length===0)return T;let e=50,a=[g`<div>${c(l.filesPerIssue,{n:t.length})}</div>`];return a.push(...t.map(n=>g`
          ${Qt(et.Linkifier.ScriptLocationLink,{sourceURL:n.url,lineNumber:n.lineNumber,options:{columnNumber:n.columnNumber,showColumnNumber:!0,inlineFrameIndex:0,maxLength:e}})}`)),g`
      <div class="details-list">
        <devtools-expandable-list .data=${{rows:a}}></devtools-expandable-list>
      </div>
    `}function so(t,e){return g`
    <devtools-report-section>
      ${t.reason in we?g`
          <div class="circled-exclamation-icon">
            <devtools-icon class="inline-icon medium" style="color: var(--icon-warning)" name="warning">
            </devtools-icon>
          </div>
          <div>
            ${we[t.reason].name()}
            ${no(t)}
            ${ro(t)}
          </div>`:T}
    </devtools-report-section>
    <div class="gray-text">
      ${t.reason}
    </div>
    ${io(t.details)}
    ${ao(e)}`}var lo=(t,e,a)=>{Xt(g`
    <style>${Qe}</style>
    <devtools-report .data=${{reportTitle:c(l.backForwardCacheTitle)}} jslog=${S.pane("back-forward-cache")}>

      ${Zt(t.frame,t.frameTreeData,t.reasonToFramesMap,t.screenStatus,t.navigateAwayAndBack)}
    </devtools-report>
  `,a)},ye=class extends X.Widget.Widget{#t="Result";#e=0;#o;constructor(e=lo){super({useShadowDom:!0,delegatesFocus:!0}),this.#o=e,this.#r()?.addEventListener(p.ResourceTreeModel.Events.PrimaryPageChanged,this.requestUpdate,this),this.#r()?.addEventListener(p.ResourceTreeModel.Events.BackForwardCacheDetailsUpdated,this.requestUpdate,this),this.requestUpdate()}#r(){return p.TargetManager.TargetManager.instance().primaryPageTarget()?.model(p.ResourceTreeModel.ResourceTreeModel)||null}#a(){return this.#r()?.mainFrame||null}async performUpdate(){let e=new Map,a=this.#a(),n=a?.backForwardCacheDetails?.explanationsTree;n&&this.#c(n,{blankCount:1},e);let i=this.#l(n,{blankCount:1});i.node.iconName="frame";let s={frame:a,frameTreeData:i,reasonToFramesMap:e,screenStatus:this.#t,navigateAwayAndBack:this.#d.bind(this)};this.#o(s,void 0,this.contentElement)}#n(){p.TargetManager.TargetManager.instance().removeModelListener(p.ResourceTreeModel.ResourceTreeModel,p.ResourceTreeModel.Events.FrameNavigated,this.#n,this),this.#t="Result",this.requestUpdate(),this.updateComplete.then(()=>{X.ARIAUtils.LiveAnnouncer.alert(c(l.testCompleted)),this.contentElement.focus()})}async#i(){p.TargetManager.TargetManager.instance().removeModelListener(p.ResourceTreeModel.ResourceTreeModel,p.ResourceTreeModel.Events.FrameNavigated,this.#i,this),await this.#s(50)}async#s(e){let n=p.TargetManager.TargetManager.instance().primaryPageTarget()?.model(p.ResourceTreeModel.ResourceTreeModel),i=await n?.navigationHistory();!n||!i||(i.currentIndex===this.#e?window.setTimeout(this.#s.bind(this,e*2),e):(p.TargetManager.TargetManager.instance().addModelListener(p.ResourceTreeModel.ResourceTreeModel,p.ResourceTreeModel.Events.FrameNavigated,this.#n,this),n.navigateToHistoryEntry(i.entries[i.currentIndex-1])))}async#d(){let a=p.TargetManager.TargetManager.instance().primaryPageTarget()?.model(p.ResourceTreeModel.ResourceTreeModel),n=await a?.navigationHistory();!a||!n||(this.#e=n.currentIndex,this.#t="Running",this.requestUpdate(),p.TargetManager.TargetManager.instance().addModelListener(p.ResourceTreeModel.ResourceTreeModel,p.ResourceTreeModel.Events.FrameNavigated,this.#i,this),a.navigate("chrome://terms"))}#l(e,a){if(!e)return{node:{text:""},frameCount:0,issueCount:0};let n=1,i=0,s=[],d="";e.url.length?d=e.url:(d=c(l.blankURLTitle,{PH1:a.blankCount}),a.blankCount+=1);for(let x of e.explanations){let y={text:x.reason};i+=1,s.push(y)}for(let x of e.children){let y=this.#l(x,a);y.issueCount>0&&(s.push(y.node),i+=y.issueCount,n+=y.frameCount)}let v={text:`(${i}) ${d}`};return s.length?(v={...v,children:s},v.iconName="iframe"):e.url.length||(a.blankCount-=1),{node:v,frameCount:n,issueCount:i}}#c(e,a,n){let i=e.url;i.length===0&&(i=c(l.blankURLTitle,{PH1:a.blankCount}),a.blankCount+=1),e.explanations.forEach(s=>{let d=n.get(s.reason);d===void 0?(d=[i],n.set(s.reason,d)):d.push(i)}),e.children.map(s=>{this.#c(s,a,n)})}};var at={};f(at,{BounceTrackingMitigationsView:()=>Ce,DEFAULT_VIEW:()=>rt,i18nString:()=>I});import"./../../../ui/components/report_view/report_view.js";import"./../../../ui/legacy/components/data_grid/data_grid.js";import"./../../../ui/kit/kit.js";import*as xe from"./../../../core/i18n/i18n.js";import*as $e from"./../../../core/sdk/sdk.js";import"./../../../ui/components/buttons/buttons.js";import*as re from"./../../../ui/legacy/legacy.js";import*as V from"./../../../ui/lit/lit.js";import*as ae from"./../../../ui/visual_logging/visual_logging.js";var ot=`devtools-data-grid{margin-top:0}.link,
.devtools-link{color:var(--sys-color-primary);text-decoration:underline;cursor:pointer;outline-offset:2px}@media (forced-colors: active){.link,
  .devtools-link{color:linktext;text-decoration-color:linktext}}
/*# sourceURL=${import.meta.resolve("./bounceTrackingMitigationsView.css")} */`;var{html:M}=V,P={bounceTrackingMitigationsTitle:"Bounce tracking mitigations",forceRun:"Force run",runningMitigations:"Running",stateDeletedFor:"State was deleted for the following sites:",checkingPotentialTrackers:"Checking for potential bounce tracking sites.",learnMore:"Learn more: Bounce Tracking Mitigations",noPotentialBounceTrackersIdentified:"State was not cleared for any potential bounce tracking sites. Either none were identified or third-party cookies are not blocked.",featureDisabled:"Bounce tracking mitigations are disabled."},co=xe.i18n.registerUIStrings("panels/application/components/BounceTrackingMitigationsView.ts",P),I=xe.i18n.getLocalizedString.bind(void 0,co),uo=t=>{let e=t.screenStatus==="Running";return M`
    <devtools-button
      aria-label=${I(P.forceRun)}
      .disabled=${e}
      .spinner=${e}
      .variant=${"primary"}
      @click=${t.runMitigations}
      jslog=${ae.action("force-run").track({click:!0})}>
      ${e?M`
        ${I(P.runningMitigations)}`:`
        ${I(P.forceRun)}
      `}
    </devtools-button>
  `},ho=t=>t.seenButtonClick?t.trackingSites.length===0?M`
      <devtools-report-section>
      ${t.screenStatus==="Running"?M`
        ${I(P.checkingPotentialTrackers)}`:`
        ${I(P.noPotentialBounceTrackersIdentified)}
      `}
      </devtools-report-section>
    `:M`
    <devtools-report-section>
      <devtools-data-grid striped inline>
        <table>
          <tr>
            <th id="sites" weight="10" sortable>
              ${I(P.stateDeletedFor)}
            </th>
          </tr>
          ${t.trackingSites.map(e=>M`
            <tr><td>${e}</td></tr>`)}
        </table>
      </devtools-data-grid>
    </devtools-report-section>
  `:V.nothing,go=t=>t.screenStatus==="Initializing"?V.nothing:t.screenStatus==="Disabled"?M`
      <devtools-report-section>
        ${I(P.featureDisabled)}
      </devtools-report-section>
    `:M`
    <devtools-report-section>
      ${uo(t)}
    </devtools-report-section>
    ${ho(t)}
    <devtools-report-divider>
    </devtools-report-divider>
    <devtools-report-section>
      <devtools-link href="https://privacycg.github.io/nav-tracking-mitigations/#bounce-tracking-mitigations" class="link"
      jslogcontext="learn-more">
        ${I(P.learnMore)}
      </devtools-link>
    </devtools-report-section>
  `,rt=(t,e,a)=>{V.render(M`
    <style>${ot}</style>
    <style>${re.inspectorCommonStyles}</style>
    <devtools-report .data=${{reportTitle:I(P.bounceTrackingMitigationsTitle)}}
                      jslog=${ae.pane("bounce-tracking-mitigations")}>
      ${go(t)}
    </devtools-report>
  `,a)},Ce=class extends re.Widget.Widget{#t=[];#e="Initializing";#o=!1;#r;constructor(e,a=rt){super(e,{useShadowDom:!0,classes:["overflow-auto"]}),this.#r=a;let n=$e.TargetManager.TargetManager.instance().primaryPageTarget();n?n.systemInfo().invoke_getFeatureState({featureState:"DIPS"}).then(i=>{this.#e=i.featureEnabled?"Result":"Disabled",this.requestUpdate()}):this.#e="Result"}wasShown(){super.wasShown(),this.requestUpdate()}performUpdate(){this.#r({screenStatus:this.#e,trackingSites:this.#t,seenButtonClick:this.#o,runMitigations:this.#a.bind(this)},void 0,this.contentElement)}async#a(){let e=$e.TargetManager.TargetManager.instance().primaryPageTarget();if(!e)return;this.#o=!0,this.#e="Running",this.requestUpdate();let a=await e.storageAgent().invoke_runBounceTrackingMitigations();this.#t=[],a.deletedSites.forEach(n=>{this.#t.push(n)}),this.#n()}#n(){this.#e="Result",this.requestUpdate()}};var st={};f(st,{CrashReportContextGrid:()=>Pe,DEFAULT_VIEW:()=>it,i18nString:()=>Q});import"./../../../ui/legacy/components/data_grid/data_grid.js";import*as Te from"./../../../core/host/host.js";import*as Ie from"./../../../core/i18n/i18n.js";import*as ne from"./../../../ui/legacy/legacy.js";import{html as nt,render as po}from"./../../../ui/lit/lit.js";var Y={key:"Key",value:"Value",copyKey:"Copy key",copyValue:"Copy value"},mo=Ie.i18n.registerUIStrings("panels/application/components/CrashReportContextGrid.ts",Y),Q=Ie.i18n.getLocalizedString.bind(void 0,mo),it=(t,e,a)=>{po(nt`
      <style>
        :host {
          display: block;
        }

        div {
          overflow: auto;
        }

        td {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      </style>
      <style>${ne.inspectorCommonStyles}</style>
      <div>
        <devtools-data-grid striped inline>
          <table>
            <thead>
              <tr>
                <th id="key" weight="50">${Q(Y.key)}</th>
                <th id="value" weight="50">${Q(Y.value)}</th>
              </tr>
            </thead>
            <tbody>
              ${t.entries.map(n=>nt`
                <tr class=${t.selectedKey===n.key?"selected":""}
                    @select=${()=>t.onSelect(n.key)}
                    @contextmenu=${i=>t.onContextMenu(i,n.key,n.value)}>
                  <td title=${n.key}>${n.key}</td>
                  <td title=${n.value}>${n.value}</td>
                </tr>
              `)}
            </tbody>
          </table>
        </devtools-data-grid>
      </div>
    `,a)},Pe=class extends ne.Widget.Widget{#t=[];#e=[];#o;#r=[];#a;constructor(e,a=it){super(e,{useShadowDom:!0}),this.#a=a}set data(e){this.#t=e.entries,this.#o=e.selectedKey,this.#r=e.filters||[],this.requestUpdate()}#n(){if(this.#r.length===0){this.#e=this.#t;return}this.#e=this.#t.filter(e=>this.#r.every(a=>{let n=a.regex;if(!n)return!0;let i=n.test(e.key)||n.test(e.value);return a.negative?!i:i}))}#i(e,a,n){let s=e.detail;s.defaultSection().appendItem(Q(Y.copyKey),()=>{Te.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(a)},{jslogContext:"copy-key"}),s.defaultSection().appendItem(Q(Y.copyValue),()=>{Te.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(n)},{jslogContext:"copy-value"})}performUpdate(){this.#n(),this.#a({entries:this.#e,selectedKey:this.#o,onSelect:e=>this.element.dispatchEvent(new CustomEvent("select",{detail:e})),onContextMenu:(e,a,n)=>this.#i(e,a,n)},void 0,this.contentElement)}};var ut={};f(ut,{DEFAULT_VIEW:()=>ct,EndpointsGrid:()=>Me,i18nString:()=>De});import"./../../../ui/legacy/components/data_grid/data_grid.js";import*as A from"./../../../core/i18n/i18n.js";import*as se from"./../../../ui/legacy/legacy.js";import*as vo from"./../../../ui/lit/lit.js";import*as lt from"./../../../ui/visual_logging/visual_logging.js";var dt=`@scope to (devtools-widget > *){:scope{overflow:auto;height:100%}.endpoints-container{height:100%;display:flex;flex-direction:column;width:100%}.endpoints-header{font-size:15px;background-color:var(--sys-color-surface2);padding:1px 4px;flex-shrink:0}devtools-data-grid{flex:auto}}
/*# sourceURL=${import.meta.resolve("./endpointsGrid.css")} */`;var Re={noEndpointsToDisplay:"No endpoints to display",endpointsDescription:"Here you will find the list of endpoints that receive the reports"},fo=A.i18n.registerUIStrings("panels/application/components/EndpointsGrid.ts",Re),De=A.i18n.getLocalizedString.bind(void 0,fo),{render:bo,html:ie}=vo,ct=(t,e,a)=>{bo(ie`
    <style>${dt}</style>
    <style>${se.inspectorCommonStyles}</style>
    <div class="endpoints-container" jslog=${lt.section("endpoints")}>
      <div class="endpoints-header">${A.i18n.lockedString("Endpoints")}</div>
      ${t.endpoints.size>0?ie`
        <devtools-data-grid striped>
         <table>
          <tr>
            <th id="origin" weight="30">${A.i18n.lockedString("Origin")}</th>
            <th id="name" weight="20">${A.i18n.lockedString("Name")}</th>
            <th id="url" weight="30">${A.i18n.lockedString("URL")}</th>
          </tr>
          ${Array.from(t.endpoints).map(([n,i])=>i.map(s=>ie`<tr>
                <td>${n}</td>
                <td>${s.groupName}</td>
                <td>${s.url}</td>
              </tr>`)).flat()}
          </table>
        </devtools-data-grid>
      `:ie`
        <div class="empty-state">
          <span class="empty-state-header">${De(Re.noEndpointsToDisplay)}</span>
          <span class="empty-state-description">${De(Re.endpointsDescription)}</span>
        </div>
      `}
    </div>
  `,a)},Me=class extends se.Widget.Widget{endpoints=new Map;#t;constructor(e,a=ct){super(e),this.#t=a,this.requestUpdate()}performUpdate(){this.#t({endpoints:this.endpoints},void 0,this.contentElement)}};var pt={};f(pt,{InterestGroupAccessGrid:()=>de,i18nString:()=>F});import"./../../../ui/legacy/components/data_grid/data_grid.js";import*as Le from"./../../../core/i18n/i18n.js";import*as gt from"./../../../ui/legacy/legacy.js";import*as Ee from"./../../../ui/lit/lit.js";var ht=`:host{display:flex;padding:20px;height:100%}.heading{font-size:15px}devtools-data-grid{margin-top:20px}.info-icon{vertical-align:text-bottom;height:14px}.no-events-message{margin-top:20px}
/*# sourceURL=${import.meta.resolve("./interestGroupAccessGrid.css")} */`;var{html:Z}=Ee,U={allInterestGroupStorageEvents:"All interest group storage events.",eventTime:"Event Time",eventType:"Access Type",groupOwner:"Owner",groupName:"Name",noEvents:"No interest group events detected",interestGroupDescription:"On this page you can inspect and analyze interest groups"},wo=Le.i18n.registerUIStrings("panels/application/components/InterestGroupAccessGrid.ts",U),F=Le.i18n.getLocalizedString.bind(void 0,wo),de=class extends HTMLElement{#t=this.attachShadow({mode:"open"});#e=[];connectedCallback(){this.#o()}set data(e){this.#e=e,this.#o()}#o(){Ee.render(Z`
      <style>${ht}</style>
      <style>${gt.inspectorCommonStyles}</style>
      ${this.#e.length===0?Z`
          <div class="empty-state">
            <span class="empty-state-header">${F(U.noEvents)}</span>
            <span class="empty-state-description">${F(U.interestGroupDescription)}</span>
          </div>`:Z`
          <div>
            <span class="heading">Interest Groups</span>
            <devtools-icon class="info-icon medium" name="info"
                          title=${F(U.allInterestGroupStorageEvents)}>
            </devtools-icon>
            ${this.#r()}
          </div>`}
    `,this.#t,{host:this})}#r(){return Z`
      <devtools-data-grid striped inline>
        <table>
          <tr>
            <th id="event-time" sortable weight="10">${F(U.eventTime)}</td>
            <th id="event-type" sortable weight="5">${F(U.eventType)}</td>
            <th id="event-group-owner" sortable weight="10">${F(U.groupOwner)}</td>
            <th id="event-group-name" sortable weight="10">${F(U.groupName)}</td>
          </tr>
          ${this.#e.map(e=>Z`
          <tr @select=${()=>this.dispatchEvent(new CustomEvent("select",{detail:e}))}>
            <td>${new Date(1e3*e.accessTime).toLocaleString()}</td>
            <td>${e.type}</td>
            <td>${e.ownerOrigin}</td>
            <td>${e.name}</td>
          </tr>
        `)}
        </table>
      </devtools-data-grid>`}};customElements.define("devtools-interest-group-access-grid",de);var wt={};f(wt,{PermissionsPolicySection:()=>Fe,renderIconLink:()=>Ue});import"./../../../ui/kit/kit.js";import"./../../../ui/components/report_view/report_view.js";import*as Be from"./../../../core/common/common.js";import*as ce from"./../../../core/i18n/i18n.js";import*as vt from"./../../../core/sdk/sdk.js";import*as ft from"./../../network/forward/forward.js";import"./../../../ui/components/buttons/buttons.js";import*as bt from"./../../../ui/legacy/legacy.js";import{html as W,nothing as ee,render as ko}from"./../../../ui/lit/lit.js";import*as le from"./../../../ui/visual_logging/visual_logging.js";var mt=`@scope to (devtools-widget > *){:scope{display:contents}.text-ellipsis{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.link,
  .devtools-link{color:var(--sys-color-primary);text-decoration:underline;cursor:pointer;outline-offset:2px}button.link{border:none;background:none;font-family:inherit;font-size:inherit}.policies-list{padding-top:3px}.permissions-row{display:flex;line-height:22px}.permissions-row div{padding-right:5px}.feature-name{width:135px}.allowed-icon{vertical-align:sub}.block-reason{width:215px}.disabled-features-button{padding-left:var(--sys-size-3)}}
/*# sourceURL=${import.meta.resolve("./permissionsPolicySection.css")} */`;var $={showDetails:"Show details",hideDetails:"Hide details",allowedFeatures:"Allowed Features",disabledFeatures:"Disabled Features",clickToShowHeader:'Click to reveal the request whose "`Permissions-Policy`" HTTP header disables this feature.',clickToShowIframe:"Click to reveal the top-most iframe which does not allow this feature in the elements panel.",disabledByIframe:'missing in iframe "`allow`" attribute',disabledByHeader:'disabled by "`Permissions-Policy`" header',disabledByFencedFrame:"disabled inside a `fencedframe`"},yo=ce.i18n.registerUIStrings("panels/application/components/PermissionsPolicySection.ts",$),R=ce.i18n.getLocalizedString.bind(void 0,yo);function Ue(t,e,a,n){return W`
    <devtools-button
      .iconName=${t}
      title=${e}
      aria-label=${e}
      .variant=${"icon"}
      .size=${"SMALL"}
      @click=${a}
      jslog=${le.action().track({click:!0}).context(n)}>
    </devtools-button>`}function So(t){return t.length?W`
    <devtools-report-key>${R($.allowedFeatures)}</devtools-report-key>
    <devtools-report-value>${t.map(({feature:e})=>e).join(", ")}</devtools-report-value>`:ee}function $o(t,e,a,n,i){if(!t.length)return ee;if(!e)return W`
      <devtools-report-key>${R($.disabledFeatures)}</devtools-report-key>
      <devtools-report-value>
        ${t.map(({policy:d})=>d.feature).join(", ")}
        <devtools-button
            class="disabled-features-button"
            .variant=${"outlined"}
            @click=${a}
            jslog=${le.action("show-disabled-features-details").track({click:!0})}>
          ${R($.showDetails)}
        </devtools-button>
      </devtools-report-value>`;let s=t.map(({policy:d,blockReason:v,linkTargetDOMNode:x,linkTargetRequest:y})=>{let be=(()=>{switch(v){case"IframeAttribute":return R($.disabledByIframe);case"Header":return R($.disabledByHeader);case"InFencedFrameTree":return R($.disabledByFencedFrame);default:return""}})();return W`
      <div class="permissions-row">
        <div>
          <devtools-icon class="allowed-icon extra-large" name="cross-circle">
          </devtools-icon>
        </div>
        <div class="feature-name text-ellipsis">${d.feature}</div>
        <div class="block-reason">${be}</div>
        <div>
          ${x?Ue("code-circle",R($.clickToShowIframe),()=>n(x),"reveal-in-elements"):ee}
          ${y?Ue("arrow-up-down-circle",R($.clickToShowHeader),()=>i(y),"reveal-in-network"):ee}
        </div>
      </div>`});return W`
    <devtools-report-key>${R($.disabledFeatures)}</devtools-report-key>
    <devtools-report-value class="policies-list">
      ${s}
      <div class="permissions-row">
        <devtools-button
            .variant=${"outlined"}
            @click=${a}
            jslog=${le.action("hide-disabled-features-details").track({click:!0})}>
          ${R($.hideDetails)}
        </devtools-button>
      </div>
    </devtools-report-value>`}var Co=(t,e,a)=>{ko(W`
    <style>${mt}</style>
    <devtools-report-section-header>
      ${ce.i18n.lockedString("Permissions Policy")}
    </devtools-report-section-header>
    ${So(t.allowed)}
    ${t.allowed.length>0&&t.disallowed.length>0?W`<devtools-report-divider class="subsection-divider"></devtools-report-divider>`:ee}
    ${$o(t.disallowed,t.showDetails,t.onToggleShowDetails,t.onRevealDOMNode,t.onRevealHeader)}
    <devtools-report-divider></devtools-report-divider>`,a)},Fe=class extends bt.Widget.Widget{#t=[];#e=!1;#o;constructor(e,a=Co){super(e,{useShadowDom:!1}),this.#o=a}set policies(e){this.#t=e,this.requestUpdate()}get policies(){return this.#t}set showDetails(e){this.#e=e,this.requestUpdate()}get showDetails(){return this.#e}#r(){this.showDetails=!this.showDetails}async#a(e){await Be.Revealer.reveal(e)}async#n(e){if(!e)return;let a=e.responseHeaderValue("permissions-policy")?"permissions-policy":"feature-policy",n=ft.UIRequestLocation.UIRequestLocation.responseHeaderMatch(e,{name:a,value:""});await Be.Revealer.reveal(n)}async performUpdate(){let e=vt.FrameManager.FrameManager.instance(),a=this.#t.sort((d,v)=>d.feature.localeCompare(v.feature)),n=a.filter(d=>d.allowed).sort((d,v)=>d.feature.localeCompare(v.feature)),i=a.filter(d=>!d.allowed).sort((d,v)=>d.feature.localeCompare(v.feature)),s=this.#e?await Promise.all(i.map(async d=>{let v=d.locator?e.getFrame(d.locator.frameId):void 0,x=d.locator?.blockReason,y=await(x==="IframeAttribute"&&v?.getOwnerDOMNodeOrDocument()||void 0),be=v?.resourceForURL(v.url),_t=x==="Header"&&be?.request||void 0;return{policy:d,blockReason:x,linkTargetDOMNode:y,linkTargetRequest:_t}})):i.map(d=>({policy:d}));this.#o({allowed:n,disallowed:s,showDetails:this.#e,onToggleShowDetails:this.#r.bind(this),onRevealDOMNode:this.#a.bind(this),onRevealHeader:this.#n.bind(this)},void 0,this.contentElement)}};var xt={};f(xt,{ProtocolHandlersView:()=>Ne});import"./../../../ui/kit/kit.js";import*as j from"./../../../core/host/host.js";import*as He from"./../../../core/i18n/i18n.js";import*as yt from"./../../../core/platform/platform.js";import"./../../../ui/components/buttons/buttons.js";import*as St from"./../../../ui/components/input/input.js";import*as $t from"./../../../ui/i18n/i18n.js";import*as ue from"./../../../ui/legacy/legacy.js";import{html as z,i18nTemplate as xo,nothing as To,render as Po}from"./../../../ui/lit/lit.js";import*as Ct from"./../../../ui/visual_logging/visual_logging.js";var kt=`:host{display:flex;flex-direction:column}.devtools-link{color:var(--sys-color-primary);text-decoration:underline;cursor:pointer;outline-offset:2px}.devtools-link:focus-visible{outline-width:unset}input.devtools-text-input[type="text"]{padding:3px 6px;margin-left:4px;margin-right:4px;width:250px;height:25px}input.devtools-text-input[type="text"]::placeholder{color:var(--sys-color-token-subtle)}.protocol-handlers-row{margin:var(--sys-size-3) 0}.inline-icon{width:16px;height:16px;&[name="check-circle"]{color:var(--icon-checkmark-green)}}@media (forced-colors: active){.devtools-link:not(.devtools-link-prevent-click){color:linktext}.devtools-link:focus-visible{background:Highlight;color:HighlightText}}
/*# sourceURL=${import.meta.resolve("./protocolHandlersView.css")} */`;var Io="https://web.dev/url-protocol-handler/",D={protocolDetected:"Found valid protocol handler registration in the {PH1}. With the app installed, test the registered protocols.",protocolNotDetected:"Define protocol handlers in the {PH1} to register your app as a handler for custom protocols when your app is installed.",needHelpReadOur:"Need help? Read {PH1}.",protocolHandlerRegistrations:"URL protocol handler registration for PWAs",manifest:"manifest",testProtocol:"Test protocol",dropdownLabel:"Select protocol handler",textboxLabel:"Query parameter or endpoint for protocol handler",textboxPlaceholder:"Enter URL"},Ae=He.i18n.registerUIStrings("panels/application/components/ProtocolHandlersView.ts",D),K=He.i18n.getLocalizedString.bind(void 0,Ae),Ro=xo.bind(void 0,Ae);function Do(t,e){let a=t.length>0?D.protocolDetected:D.protocolNotDetected;return z`
    <div class="protocol-handlers-row status">
      <devtools-icon class="inline-icon"
                     name=${t.length>0?"check-circle":"info"}>
      </devtools-icon>
      ${$t.getFormatLocalizedStringTemplate(Ae,a,{PH1:z`
        <devtools-link href=${e} jslogcontext="manifest">${K(D.manifest)}</devtools-link>
        `})}
    </div>`}function Mo(t,e,a,n,i){return t.length===0?To:z`
    <div class="protocol-handlers-row">
      <select class="protocol-select" @change=${a}
              aria-label=${K(D.dropdownLabel)}>
        ${t.filter(s=>s.protocol).map(({protocol:s})=>z`
          <option value=${s} jslog=${Ct.item(s).track({click:!0})}>
            ${s}://
          </option>`)}
      </select>
      <input .value=${e} class="devtools-text-input" type="text"
             @change=${n} aria-label=${K(D.textboxLabel)}
             placeholder=${K(D.textboxPlaceholder)} />
      <devtools-button .variant=${"primary"} @click=${i}>
        ${K(D.testProtocol)}
      </devtools-button>
    </div>`}var Lo=(t,e,a)=>{Po(z`
    <style>${kt}</style>
    <style>${ue.inspectorCommonStyles}</style>
    <style>${St.textInputStyles}</style>
    ${Do(t.protocolHandler,t.manifestLink)}
    <div class="protocol-handlers-row">
      ${Ro(D.needHelpReadOur,{PH1:z`
        <devtools-link href=${Io} class="devtools-link" autofocus jslogcontext="learn-more">
          ${K(D.protocolHandlerRegistrations)}
        </devtools-link>`})}
    </div>
    ${Mo(t.protocolHandler,t.queryInputState,t.protocolSelectHandler,t.queryInputChangeHandler,t.testProtocolClickHandler)}
  `,a)},Ne=class extends ue.Widget.Widget{#t=[];#e=yt.DevToolsPath.EmptyUrlString;#o="";#r="";#a;constructor(e,a=Lo){super(e,{useShadowDom:!1,classes:["vbox"]}),this.#a=a}set protocolHandlers(e){this.#t=e,this.requestUpdate()}get protocolHandlers(){return this.#t}set manifestLink(e){let a=this.#e!==e;this.#e=e,a&&(this.#r="",this.#o=this.#t[0]?.protocol??""),this.requestUpdate()}get manifestLink(){return this.#e}#n=e=>{this.#o=e.target.value};#i=e=>{this.#r=e.target.value,this.requestUpdate()};#s=()=>{let e=`${this.#o}://${this.#r}`;j.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(e),j.userMetrics.actionTaken(j.UserMetrics.Action.CaptureTestProtocolClicked)};performUpdate(){this.#a({protocolHandler:this.#t,manifestLink:this.#e,queryInputState:this.#r,protocolSelectHandler:this.#n,queryInputChangeHandler:this.#i,testProtocolClickHandler:this.#s},void 0,this.contentElement)}};var It={};f(It,{DEFAULT_VIEW:()=>Pt,ReportsGrid:()=>qe,i18nString:()=>O});import"./../../../ui/kit/kit.js";import"./../../../ui/legacy/components/data_grid/data_grid.js";import*as N from"./../../../core/i18n/i18n.js";import*as he from"./../../../core/root/root.js";import*as ge from"./../../../ui/legacy/legacy.js";import*as Eo from"./../../../ui/lit/lit.js";import*as Tt from"./../../../ui/visual_logging/visual_logging.js";var We=`@scope to (devtools-widget > *){:scope{overflow:auto;height:100%}.reporting-container{height:100%;display:flex;flex-direction:column;width:100%}.reporting-header{font-size:15px;background-color:var(--sys-color-surface2);padding:1px 4px;flex-shrink:0}devtools-data-grid{flex:auto}.inline-icon{vertical-align:text-bottom}}
/*# sourceURL=${import.meta.resolve("./reportsGrid.css")} */`;var q={noReportsToDisplay:"No reports to display",reportingApiDescription:"Here you will find reporting api reports that are generated by the page.",learnMore:"Learn more",status:"Status",destination:"Destination",generatedAt:"Generated at"},Bo=N.i18n.registerUIStrings("panels/application/components/ReportsGrid.ts",q),O=N.i18n.getLocalizedString.bind(void 0,Bo),{render:Uo,html:_}=Eo,Fo="https://developer.chrome.com/docs/capabilities/web-apis/reporting-api",Pt=(t,e,a)=>{Uo(_`
    <style>${We}</style>
    <style>${ge.inspectorCommonStyles}</style>
    <div class="reporting-container" jslog=${Tt.section("reports")}>
      <div class="reporting-header">${N.i18n.lockedString("Reports")}</div>
      ${t.reports.length>0?_`
        <devtools-data-grid striped>
          <table>
            <tr>
              ${t.protocolMonitorExperimentEnabled?_`
                <th id="id" weight="30">${N.i18n.lockedString("ID")}</th>
              `:""}
              <th id="url" weight="30">${N.i18n.lockedString("URL")}</th>
              <th id="type" weight="20">${N.i18n.lockedString("Type")}</th>
              <th id="status" weight="20">
                <style>${We}</style>
                <span class="status-header">${O(q.status)}</span>
                <devtools-link href="https://web.dev/reporting-api/#report-status"
                jslogcontext="report-status">
                  <devtools-icon class="inline-icon medium" name="help" style="color: var(--icon-link);"
                  ></devtools-icon>
                </devtools-link>
              </th>
              <th id="destination" weight="20">${O(q.destination)}</th>
              <th id="timestamp" weight="20">${O(q.generatedAt)}</th>
              <th id="body" weight="20">${N.i18n.lockedString("Body")}</th>
            </tr>
            ${t.reports.map(n=>_`
              <tr @select=${()=>t.onSelect(n.id)}>
                ${t.protocolMonitorExperimentEnabled?_`<td>${n.id}</td>`:""}
                <td>${n.initiatorUrl}</td>
                <td>${n.type}</td>
                <td>${n.status}</td>
                <td>${n.destination}</td>
                <td>${new Date(n.timestamp*1e3).toLocaleString()}</td>
                <td>${JSON.stringify(n.body)}</td>
              </tr>
            `)}
          </table>
        </devtools-data-grid>
      `:_`
        <div class="empty-state">
          <span class="empty-state-header">${O(q.noReportsToDisplay)}</span>
          <div class="empty-state-description">
            <span>${O(q.reportingApiDescription)}</span>
            <devtools-link
              class="devtools-link"
              href=${Fo}
              jslogcontext="learn-more"
            >${O(q.learnMore)}</devtools-link>
          </div>
        </div>
      `}
    </div>
  `,a)},qe=class extends ge.Widget.Widget{reports=[];#t=!1;#e;onReportSelected=()=>{};constructor(e,a=Pt){super(e),this.#e=a,this.#t=he.Runtime.experiments.isEnabled(he.ExperimentNames.ExperimentName.PROTOCOL_MONITOR),this.requestUpdate()}performUpdate(){let e={reports:this.reports,protocolMonitorExperimentEnabled:this.#t,onSelect:this.onReportSelected};this.#e(e,void 0,this.contentElement)}};var Lt={};f(Lt,{ServiceWorkerRouterView:()=>Oe});import*as Dt from"./../../../ui/legacy/legacy.js";import{html as Mt,render as No}from"./../../../ui/lit/lit.js";var Rt=`:host{display:block;white-space:normal;max-width:400px}.router-rules{border:1px solid var(--sys-color-divider);border-spacing:0;padding-left:10px;padding-right:10px;line-height:initial;margin-top:0;padding-bottom:12px;text-wrap:balance}.router-rule{display:flex;margin-top:12px;flex-direction:column}.rule-id{color:var(--sys-color-token-subtle)}.item{display:flex;flex-direction:column;padding-left:10px}.condition,
.source{list-style:none;display:flex;margin-top:4px;flex-direction:row}.condition > *,
.source > *{word-break:break-all;line-height:1.5em}.rule-type{flex:0 0 18%}
/*# sourceURL=${import.meta.resolve("./serviceWorkerRouterView.css")} */`;function Ho(t){return Mt`
    <li class="router-rule">
      <div class="rule-id">Rule ${t.id}</div>
      <ul class="item">
        <li class="condition">
          <div class="rule-type">Condition</div>
          <div class="rule-value">${t.condition}</div>
        </li>
        <li class="source">
          <div class="rule-type">Source</div>
          <div class="rule-value">${t.source}</div>
        </li>
      </ul>
    </li>`}var Ao=(t,e,a)=>{No(Mt`
    <style>${Rt}</style>
    <ul class="router-rules">
      ${t.rules.map(Ho)}
    </ul>`,a)},Oe=class extends Dt.Widget.Widget{#t=[];#e;constructor(e,a=Ao){super(e,{useShadowDom:!0}),this.#e=a}set rules(e){this.#t=e,this.#t.length>0&&this.requestUpdate()}get rules(){return this.#t}performUpdate(){this.#e({rules:this.#t},void 0,this.contentElement)}};var Ft={};f(Ft,{DEFAULT_VIEW:()=>Ut,SharedStorageAccessGrid:()=>Ke,i18nString:()=>k});import"./../../../ui/kit/kit.js";import"./../../../ui/legacy/components/data_grid/data_grid.js";import*as ze from"./../../../core/i18n/i18n.js";import*as Bt from"./../../../ui/legacy/legacy.js";import*as Wo from"./../../../ui/lit/lit.js";import*as Ve from"./../../../ui/visual_logging/visual_logging.js";var Et=`@scope to (devtools-widget > *){:scope{padding:20px;height:100%;display:flex}.heading{font-size:15px}devtools-data-grid{margin-top:20px}.info-icon{vertical-align:text-bottom;height:14px}.no-events-message{margin-top:20px}}
/*# sourceURL=${import.meta.resolve("./sharedStorageAccessGrid.css")} */`;var qo="https://developers.google.com/privacy-sandbox/private-advertising/shared-storage",{render:Oo,html:pe}=Wo,w={sharedStorage:"Shared storage",allSharedStorageEvents:"All shared storage events for this page.",eventTime:"Event Time",eventScope:"Access Scope",eventMethod:"Access Method",ownerOrigin:"Owner Origin",ownerSite:"Owner Site",eventParams:"Optional Event Params",noEvents:"No shared storage events detected",sharedStorageDescription:"On this page you can view, add, edit and delete shared storage key-value pairs and view shared storage events.",learnMore:"Learn more"},Vo=ze.i18n.registerUIStrings("panels/application/components/SharedStorageAccessGrid.ts",w),k=ze.i18n.getLocalizedString.bind(void 0,Vo),Ut=(t,e,a)=>{Oo(pe`
    <style>${Et}</style>
    ${t.events.length===0?pe`
        <div class="empty-state" jslog=${Ve.section().context("empty-view")}>
          <div class="empty-state-header">${k(w.noEvents)}</div>
          <div class="empty-state-description">
            <span>${k(w.sharedStorageDescription)}</span>
            <devtools-link
              class="devtools-link"
              href=${qo}
              .jslogContext=${"learn-more"}
            >${k(w.learnMore)}</devtools-link>
          </div>
        </div>`:pe`
        <div jslog=${Ve.section("events-table")}>
          <span class="heading">${k(w.sharedStorage)}</span>
          <devtools-icon class="info-icon medium" name="info"
                          title=${k(w.allSharedStorageEvents)}>
          </devtools-icon>
          <devtools-data-grid striped inline>
            <table>
              <thead>
                <tr>
                  <th id="event-time" weight="10" sortable>
                    ${k(w.eventTime)}
                  </th>
                  <th id="event-scope" weight="10" sortable>
                    ${k(w.eventScope)}
                  </th>
                  <th id="event-method" weight="10" sortable>
                    ${k(w.eventMethod)}
                  </th>
                  <th id="event-owner-origin" weight="10" sortable>
                    ${k(w.ownerOrigin)}
                  </th>
                  <th id="event-owner-site" weight="10" sortable>
                    ${k(w.ownerSite)}
                  </th>
                  <th id="event-params" weight="10" sortable>
                    ${k(w.eventParams)}
                  </th>
                </tr>
              </thead>
              <tbody>
                ${t.events.map(n=>pe`
                  <tr @select=${()=>t.onSelect(n)}>
                    <td data-value=${n.accessTime}>
                      ${new Date(1e3*n.accessTime).toLocaleString()}
                    </td>
                    <td>${n.scope}</td>
                    <td>${n.method}</td>
                    <td>${n.ownerOrigin}</td>
                    <td>${n.ownerSite}</td>
                    <td>${JSON.stringify(n.params)}</td>
                  </tr>
                `)}
              </tbody>
            </table>
          </devtools-data-grid>
        </div>`}`,a)},Ke=class extends Bt.Widget.Widget{#t;#e=[];#o=()=>{};constructor(e,a=Ut){super(e,{useShadowDom:!0}),this.#t=a,this.performUpdate()}set events(e){this.#e=e,this.performUpdate()}set onSelect(e){this.#o=e,this.performUpdate()}get onSelect(){return this.#o}performUpdate(){this.#t({events:this.#e,onSelect:this.#o.bind(this)},{},this.contentElement)}};var Kt={};f(Kt,{SharedStorageMetadataView:()=>me});import"./../../../ui/kit/kit.js";import*as je from"./../../../core/i18n/i18n.js";import"./../../../ui/components/buttons/buttons.js";import*as jo from"./../../../ui/lit/lit.js";var Nt=`.text-ellipsis{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}devtools-icon{vertical-align:text-bottom;margin-left:var(--sys-size-3);width:16px;height:16px}devtools-button{vertical-align:sub;margin-left:var(--sys-size-3)}.entropy-budget{display:flex;align-items:center;height:18px}
/*# sourceURL=${import.meta.resolve("./sharedStorageMetadataView.css")} */`;var Vt={};f(Vt,{StorageMetadataView:()=>G});import"./../../../ui/components/report_view/report_view.js";import*as te from"./../../../core/i18n/i18n.js";import*as At from"./../../../core/sdk/sdk.js";import"./../../../ui/components/buttons/buttons.js";import*as Wt from"./../../../ui/components/legacy_wrapper/legacy_wrapper.js";import*as qt from"./../../../ui/components/render_coordinator/render_coordinator.js";import*as Ot from"./../../../ui/legacy/legacy.js";import{html as b,nothing as C,render as Ko}from"./../../../ui/lit/lit.js";var Ht=`.default-bucket{font-style:italic}
/*# sourceURL=${import.meta.resolve("./storageMetadataView.css")} */`;var u={origin:"Frame origin",topLevelSite:"Top-level site",opaque:"(opaque)",isOpaque:"Is opaque",isThirdParty:"Is third-party",yes:"Yes",no:"No",yesBecauseTopLevelIsOpaque:"Yes, because the top-level site is opaque",yesBecauseKeyIsOpaque:"Yes, because the storage key is opaque",yesBecauseOriginNotInTopLevelSite:"Yes, because the origin is outside of the top-level site",yesBecauseAncestorChainHasCrossSite:"Yes, because the ancestry chain contains a third-party origin",loading:"Loading\u2026",bucketName:"Bucket name",defaultBucket:"Default bucket",persistent:"Is persistent",durability:"Durability",quota:"Quota",expiration:"Expiration",none:"None",deleteBucket:"Delete bucket",confirmBucketDeletion:'Delete the "{PH1}" bucket?',bucketWillBeRemoved:"The selected storage bucket and contained data will be removed."},zo=te.i18n.registerUIStrings("panels/application/components/StorageMetadataView.ts",u),h=te.i18n.getLocalizedString.bind(void 0,zo),G=class extends Wt.LegacyWrapper.WrappableComponent{#t=this.attachShadow({mode:"open"});#e;#o=null;#r=null;#a=!0;setStorageKey(e){this.#o=At.StorageKeyManager.parseStorageKey(e),this.render()}setStorageBucket(e){this.#r=e,this.setStorageKey(e.bucket.storageKey)}setShowOnlyBucket(e){this.#a=e}enableStorageBucketControls(e){this.#e=e,this.#o&&this.render()}render(){return qt.write("StorageMetadataView render",async()=>{Ko(b`
        <style>${Ht}</style>
        <devtools-report .data=${{reportTitle:this.getTitle()??h(u.loading)}}>
          ${await this.renderReportContent()}
        </devtools-report>`,this.#t,{host:this})})}getTitle(){if(!this.#o)return;let e=this.#o.origin,a=this.#r?.bucket.name||h(u.defaultBucket);return this.#e?`${a} - ${e}`:e}key(e){return b`<devtools-report-key>${e}</devtools-report-key>`}value(e){return b`<devtools-report-value>${e}</devtools-report-value>`}async renderReportContent(){if(!this.#o)return C;let e=this.#o.origin,a=!!this.#o.components.get("3"),n=!!this.#o.components.get("1"),i=!!this.#o.components.get("4"),s=this.#o.components.get("0"),d=a?h(u.yesBecauseAncestorChainHasCrossSite):n?h(u.yesBecauseKeyIsOpaque):i?h(u.yesBecauseTopLevelIsOpaque):s&&e!==s?h(u.yesBecauseOriginNotInTopLevelSite):null;return b`
        ${s&&e!==s?b`${this.key(h(u.origin))}
            ${this.value(b`<div class="text-ellipsis" title=${e}>${e}</div>`)}`:C}
        ${s||i?this.key(h(u.topLevelSite)):C}
        ${s?this.value(s):C}
        ${i?this.value(h(u.opaque)):C}
        ${d?b`
          ${this.key(h(u.isThirdParty))}${this.value(d)}`:C}
        ${n||i?this.key(h(u.isOpaque)):C}
        ${n?this.value(h(u.yes)):C}
        ${i?this.value(h(u.yesBecauseTopLevelIsOpaque)):C}
        ${this.#r?this.#n():C}
        ${this.#e?this.#s():C}`}#n(){if(!this.#r)throw new Error("Should not call #renderStorageBucketInfo if #bucket is null.");let{bucket:{name:e},persistent:a,durability:n,quota:i}=this.#r,s=!e;return this.#a?b`
      ${this.key(h(u.bucketName))}
      ${this.value(e||b`<span class="default-bucket">default</span>`)}
      ${this.key(h(u.persistent))}
      ${this.value(h(a?u.yes:u.no))}
      ${this.key(h(u.durability))}
      ${this.value(n)}
      ${this.key(h(u.quota))}
      ${this.value(te.ByteUtilities.bytesToString(i))}
      ${this.key(h(u.expiration))}
      ${this.value(this.#i())}`:s?b`
          ${this.key(h(u.bucketName))}
          ${this.value(b`<span class="default-bucket">default</span>`)}`:b`
        ${this.key(h(u.bucketName))}
        ${this.value(e)}`}#i(){if(!this.#r)throw new Error("Should not call #getExpirationString if #bucket is null.");let{expiration:e}=this.#r;return e===0?h(u.none):new Date(e*1e3).toLocaleString()}#s(){return b`
    <devtools-report-divider></devtools-report-divider>
    <devtools-report-section>
      <devtools-button aria-label=${h(u.deleteBucket)}
                       .variant=${"outlined"}
                       @click=${this.#d}>
        ${h(u.deleteBucket)}
      </devtools-button>
    </devtools-report-section>`}async#d(){if(!this.#e||!this.#r)throw new Error("Should not call #deleteBucket if #storageBucketsModel or #storageBucket is null.");await Ot.UIUtils.ConfirmDialog.show(h(u.bucketWillBeRemoved),h(u.confirmBucketDeletion,{PH1:this.#r.bucket.name||""}),this,{jslogContext:"delete-bucket-confirmation"})&&this.#e.deleteBucket(this.#r.bucket)}};customElements.define("devtools-storage-metadata-view",G);var{html:J}=jo,L={sharedStorage:"Shared storage",creation:"Creation Time",notYetCreated:"Not yet created",numEntries:"Number of Entries",entropyBudget:"Entropy Budget for Fenced Frames",budgetExplanation:"Remaining data leakage allowed within a 24-hour period for this origin in bits of entropy",resetBudget:"Reset Budget",numBytesUsed:"Number of Bytes Used"},_o=je.i18n.registerUIStrings("panels/application/components/SharedStorageMetadataView.ts",L),H=je.i18n.getLocalizedString.bind(void 0,_o),me=class extends G{#t;#e=null;#o=0;#r=0;#a=0;constructor(e,a){super(),this.#t=e,this.classList.add("overflow-auto"),this.setStorageKey(a)}async#n(){await this.#t.resetBudget(),await this.render()}getTitle(){return H(L.sharedStorage)}async renderReportContent(){let e=await this.#t.getMetadata();return this.#e=e?.creationTime??null,this.#o=e?.length??0,this.#r=e?.bytesUsed??0,this.#a=e?.remainingBudget??0,J`
      <style>${Nt}</style>
      ${await super.renderReportContent()}
      ${this.key(H(L.creation))}
      ${this.value(this.#i())}
      ${this.key(H(L.numEntries))}
      ${this.value(String(this.#o))}
      ${this.key(H(L.numBytesUsed))}
      ${this.value(String(this.#r))}
      ${this.key(J`<span class="entropy-budget">${H(L.entropyBudget)}<devtools-icon name="info" title=${H(L.budgetExplanation)}></devtools-icon></span>`)}
      ${this.value(J`<span class="entropy-budget">${this.#a}${this.#s()}</span>`)}`}#i(){if(!this.#e)return J`${H(L.notYetCreated)}`;let e=new Date(1e3*this.#e);return J`${e.toLocaleString()}`}#s(){return J`
      <devtools-button .iconName=${"undo"}
                       .jslogContext=${"reset-entropy-budget"}
                       .size=${"SMALL"}
                       .title=${H(L.resetBudget)}
                       .variant=${"icon"}
                       @click=${this.#n.bind(this)}></devtools-button>
    `}};customElements.define("devtools-shared-storage-metadata-view",me);var jt={};f(jt,{TrustTokensView:()=>Je,i18nString:()=>B});import"./../../../ui/kit/kit.js";import"./../../../ui/legacy/components/data_grid/data_grid.js";import*as Xe from"./../../../core/i18n/i18n.js";import*as Ge from"./../../../core/sdk/sdk.js";import"./../../../ui/components/buttons/buttons.js";import*as fe from"./../../../ui/legacy/legacy.js";import*as Ye from"./../../../ui/lit/lit.js";import*as oe from"./../../../ui/visual_logging/visual_logging.js";var zt=`:host{padding:20px;height:100%;display:flex}.heading{font-size:15px}devtools-data-grid{margin-top:20px;& devtools-button{width:14px;height:14px}}devtools-icon{width:14px;height:14px}.no-tt-message{margin-top:20px}
/*# sourceURL=${import.meta.resolve("./trustTokensView.css")} */`;var Go="https://developers.google.com/privacy-sandbox/protections/private-state-tokens",{html:ve}=Ye,E={issuer:"Issuer",storedTokenCount:"Stored token count",allStoredTrustTokensAvailableIn:"All stored private state tokens available in this browser instance.",noTrustTokens:"No private state tokens detected",trustTokensDescription:"On this page you can view all available private state tokens in the current browsing context.",deleteTrustTokens:"Delete all stored private state tokens issued by {PH1}.",trustTokens:"Private state tokens",learnMore:"Learn more"},Jo=Xe.i18n.registerUIStrings("panels/application/components/TrustTokensView.ts",E),B=Xe.i18n.getLocalizedString.bind(void 0,Jo),Xo=1e3;function Yo(t){return t.tokens.length===0?ve`
        <div jslog=${oe.pane("trust-tokens")}>
          <div class="empty-state" jslog=${oe.section().context("empty-view")}>
            <div class="empty-state-header">${B(E.noTrustTokens)}</div>
            <div class="empty-state-description">
              <span>${B(E.trustTokensDescription)}</span>
              <devtools-link
                class="devtools-link"
                href=${Go}
                .jslogContext=${"learn-more"}
              >${B(E.learnMore)}</devtools-link>
            </div>
          </div>
        </div>
      `:ve`
      <div jslog=${oe.pane("trust-tokens")}>
        <span class="heading">${B(E.trustTokens)}</span>
        <devtools-icon name="info" title=${B(E.allStoredTrustTokensAvailableIn)}></devtools-icon>
        <devtools-data-grid striped inline>
          <table>
            <tr>
              <th id="issuer" weight="10" sortable>${B(E.issuer)}</th>
              <th id="count" weight="5" sortable>${B(E.storedTokenCount)}</th>
              <th id="delete-button" weight="1" sortable></th>
            </tr>
            ${t.tokens.filter(e=>e.count>0).map(e=>ve`
                <tr>
                  <td>${_e(e.issuerOrigin)}</td>
                  <td>${e.count}</td>
                  <td>
                    <devtools-button .iconName=${"bin"}
                                    .jslogContext=${"delete-all"}
                                    .size=${"SMALL"}
                                    .title=${B(E.deleteTrustTokens,{PH1:_e(e.issuerOrigin)})}
                                    .variant=${"icon"}
                                    @click=${()=>t.deleteClickHandler(_e(e.issuerOrigin))}></devtools-button>
                  </td>
                </tr>
              `)}
          </table>
        </devtools-data-grid>
      </div>
    `}var Qo=(t,e,a)=>{Ye.render(ve`
    <style>${zt}</style>
    <style>${fe.inspectorCommonStyles}</style>
    ${Yo(t)}
  `,a)},Je=class extends fe.Widget.VBox{#t=0;#e=[];#o;constructor(e,a=Qo){super(e,{useShadowDom:!0}),this.#o=a}wasShown(){super.wasShown(),this.requestUpdate(),this.#t=setInterval(this.requestUpdate.bind(this),Xo)}willHide(){super.willHide(),clearInterval(this.#t),this.#t=0}async performUpdate(){let e=Ge.TargetManager.TargetManager.instance().primaryPageTarget();if(!e)return;let{tokens:a}=await e.storageAgent().invoke_getTrustTokens();a.sort((n,i)=>n.issuerOrigin.localeCompare(i.issuerOrigin)),this.#e=a,this.#o({tokens:this.#e,deleteClickHandler:this.#r.bind(this)},void 0,this.contentElement)}#r(e){Ge.TargetManager.TargetManager.instance().primaryPageTarget()?.storageAgent().invoke_clearTrustTokens({issuerOrigin:e})}};function _e(t){return t.replace(/\/$/,"")}export{tt as BackForwardCacheView,at as BounceTrackingMitigationsView,st as CrashReportContextGrid,ut as EndpointsGrid,pt as InterestGroupAccessGrid,wt as PermissionsPolicySection,xt as ProtocolHandlersView,It as ReportsGrid,Lt as ServiceWorkerRouterView,Ft as SharedStorageAccessGrid,Kt as SharedStorageMetadataView,Vt as StorageMetadataView,jt as TrustTokensView};
//# sourceMappingURL=components.js.map
