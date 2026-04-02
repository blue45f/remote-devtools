var yt=Object.defineProperty;var T=(t,e)=>{for(var r in e)yt(t,r,{get:e[r],enumerable:!0})};var Be={};T(Be,{DEFAULT_VIEW:()=>Ce,MismatchedPreloadingGrid:()=>O,i18nString:()=>k});import"./../../../../ui/legacy/components/data_grid/data_grid.js";import*as Q from"./../../../../core/i18n/i18n.js";import"./../../../../core/sdk/sdk.js";import*as U from"./../../../../third_party/diff/diff.js";import*as $e from"./../../../../ui/legacy/legacy.js";import*as Rt from"./../../../../ui/lit/lit.js";import*as g from"./../../../../core/i18n/i18n.js";import*as Te from"./../../../../core/platform/platform.js";import{assertNotNullOrUndefined as Ue}from"./../../../../core/platform/platform.js";import"./../../../../core/sdk/sdk.js";import*as Ie from"./../../../../models/bindings/bindings.js";var i={PrefetchFailedIneligibleRedirect:"The prefetch was redirected, but the redirect URL is not eligible for prefetch.",PrefetchFailedInvalidRedirect:"The prefetch was redirected, but there was a problem with the redirect.",PrefetchFailedMIMENotSupported:"The prefetch failed because the response's Content-Type header was not supported.",PrefetchFailedNetError:"The prefetch failed because of a network error.",PrefetchFailedNon2XX:"The prefetch failed because of a non-2xx HTTP response status code.",PrefetchFailedNon2XXWithStatusCode:"The prefetch failed because of a non-2xx HTTP response status code ({PH1}).",PrefetchIneligibleRetryAfter:"A previous prefetch to the origin got a HTTP 503 response with an Retry-After header that has not elapsed yet.",PrefetchIsPrivacyDecoy:"The URL was not eligible to be prefetched because there was a registered service worker or cross-site cookies for that origin, but the prefetch was put on the network anyways and not used, to disguise that the user had some kind of previous relationship with the origin.",PrefetchIsStale:"Too much time elapsed between the prefetch and usage, so the prefetch was discarded.",PrefetchNotEligibleBrowserContextOffTheRecord:"The prefetch was not performed because the browser is in Incognito or Guest mode.",PrefetchNotEligibleDataSaverEnabled:"The prefetch was not performed because the operating system is in Data Saver mode.",PrefetchNotEligibleExistingProxy:"The URL is not eligible to be prefetched, because in the default network context it is configured to use a proxy server.",PrefetchNotEligibleHostIsNonUnique:"The URL was not eligible to be prefetched because its host was not unique (e.g., a non publicly routable IP address or a hostname which is not registry-controlled), but the prefetch was required to be proxied.",PrefetchNotEligibleNonDefaultStoragePartition:"The URL was not eligible to be prefetched because it uses a non-default storage partition.",PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy:"The URL was not eligible to be prefetched because the default network context cannot be configured to use the prefetch proxy for a same-site cross-origin prefetch request.",PrefetchNotEligibleSchemeIsNotHttps:"The URL was not eligible to be prefetched because its scheme was not https:.",PrefetchNotEligibleUserHasCookies:"The URL was not eligible to be prefetched because it was cross-site, but the user had cookies for that origin.",PrefetchNotEligibleUserHasServiceWorker:"The URL was not eligible to be prefetched because there was a registered service worker for that origin, which is currently not supported.",PrefetchNotUsedCookiesChanged:"The prefetch was not used because it was a cross-site prefetch, and cookies were added for that URL while the prefetch was ongoing, so the prefetched response is now out-of-date.",PrefetchProxyNotAvailable:"A network error was encountered when trying to set up a connection to the prefetching proxy.",PrefetchNotUsedProbeFailed:"The prefetch was blocked by your Internet Service Provider or network administrator.",PrefetchEvictedForNewerPrefetch:"The prefetch was discarded because the initiating page has too many prefetches ongoing, and this was one of the oldest.",PrefetchEvictedAfterCandidateRemoved:"The prefetch was discarded because no speculation rule in the initating page triggers a prefetch for this URL anymore.",PrefetchNotEligibleBatterySaverEnabled:"The prefetch was not performed because the Battery Saver setting was enabled.",PrefetchNotEligiblePreloadingDisabled:"The prefetch was not performed because speculative loading was disabled.",PrefetchEvictedAfterBrowsingDataRemoved:"The prefetch was discarded because browsing data was removed.",prerenderFinalStatusLowEndDevice:"The prerender was not performed because this device does not have enough total system memory to support prerendering.",prerenderFinalStatusInvalidSchemeRedirect:"The prerendering navigation failed because it redirected to a URL whose scheme was not http: or https:.",prerenderFinalStatusInvalidSchemeNavigation:"The URL was not eligible to be prerendered because its scheme was not http: or https:.",prerenderFinalStatusNavigationRequestBlockedByCsp:"The prerendering navigation was blocked by a Content Security Policy.",prerenderFinalStatusMojoBinderPolicy:"The prerendered page used a forbidden JavaScript API that is currently not supported. (Internal Mojo interface: {PH1})",prerenderFinalStatusRendererProcessCrashed:"The prerendered page crashed.",prerenderFinalStatusRendererProcessKilled:"The prerendered page was killed.",prerenderFinalStatusDownload:"The prerendered page attempted to initiate a download, which is currently not supported.",prerenderFinalStatusNavigationBadHttpStatus:"The prerendering navigation failed because of a non-2xx HTTP response status code.",prerenderFinalStatusNavigationBadHttpStatusWithStatusCode:"The prerendering navigation failed because of a non-2xx HTTP response status code ({PH1}).",prerenderFinalStatusClientCertRequested:"The prerendering navigation required a HTTP client certificate.",prerenderFinalStatusNavigationRequestNetworkError:"The prerendering navigation encountered a network error.",prerenderFinalStatusSslCertificateError:"The prerendering navigation failed because of an invalid SSL certificate.",prerenderFinalStatusLoginAuthRequested:"The prerendering navigation required HTTP authentication, which is currently not supported.",prerenderFinalStatusUaChangeRequiresReload:"Changing User Agent occurred in prerendering navigation.",prerenderFinalStatusBlockedByClient:"Some resource load was blocked.",prerenderFinalStatusAudioOutputDeviceRequested:"The prerendered page requested audio output, which is currently not supported.",prerenderFinalStatusMixedContent:"The prerendered page contained mixed content.",prerenderFinalStatusTriggerBackgrounded:"The initiating page was backgrounded, so the prerendered page was discarded.",prerenderFinalStatusMemoryLimitExceeded:"The prerender was not performed because the browser exceeded the prerendering memory limit.",prerenderFinalStatusDataSaverEnabled:"The prerender was not performed because the user requested that the browser use less data.",prerenderFinalStatusHasEffectiveUrl:"The initiating page cannot perform prerendering, because it has an effective URL that is different from its normal URL. (For example, the New Tab Page, or hosted apps.)",prerenderFinalStatusTimeoutBackgrounded:"The initiating page was backgrounded for a long time, so the prerendered page was discarded.",prerenderFinalStatusCrossSiteRedirectInInitialNavigation:"The prerendering navigation failed because the prerendered URL redirected to a cross-site URL.",prerenderFinalStatusCrossSiteNavigationInInitialNavigation:"The prerendering navigation failed because it targeted a cross-site URL.",prerenderFinalStatusSameSiteCrossOriginRedirectNotOptInInInitialNavigation:"The prerendering navigation failed because the prerendered URL redirected to a cross-origin same-site URL, but the destination response did not include the appropriate Supports-Loading-Mode header.",prerenderFinalStatusSameSiteCrossOriginNavigationNotOptInInInitialNavigation:"The prerendering navigation failed because it was to a cross-origin same-site URL, but the destination response did not include the appropriate Supports-Loading-Mode header.",prerenderFinalStatusActivationNavigationParameterMismatch:"The prerender was not used because during activation time, different navigation parameters (e.g., HTTP headers) were calculated than during the original prerendering navigation request.",prerenderFinalStatusPrimaryMainFrameRendererProcessCrashed:"The initiating page crashed.",prerenderFinalStatusPrimaryMainFrameRendererProcessKilled:"The initiating page was killed.",prerenderFinalStatusActivationFramePolicyNotCompatible:"The prerender was not used because the sandboxing flags or permissions policy of the initiating page was not compatible with those of the prerendering page.",prerenderFinalStatusPreloadingDisabled:"The prerender was not performed because the user disabled preloading in their browser settings.",prerenderFinalStatusBatterySaverEnabled:"The prerender was not performed because the user requested that the browser use less battery.",prerenderFinalStatusActivatedDuringMainFrameNavigation:"Prerendered page activated during initiating page's main frame navigation.",prerenderFinalStatusCrossSiteRedirectInMainFrameNavigation:"The prerendered page navigated to a URL which redirected to a cross-site URL.",prerenderFinalStatusCrossSiteNavigationInMainFrameNavigation:"The prerendered page navigated to a cross-site URL.",prerenderFinalStatusSameSiteCrossOriginRedirectNotOptInInMainFrameNavigation:"The prerendered page navigated to a URL which redirected to a cross-origin same-site URL, but the destination response did not include the appropriate Supports-Loading-Mode header.",prerenderFinalStatusSameSiteCrossOriginNavigationNotOptInInMainFrameNavigation:"The prerendered page navigated to a cross-origin same-site URL, but the destination response did not include the appropriate Supports-Loading-Mode header.",prerenderFinalStatusMemoryPressureOnTrigger:"The prerender was not performed because the browser was under critical memory pressure.",prerenderFinalStatusMemoryPressureAfterTriggered:"The prerendered page was unloaded because the browser came under critical memory pressure.",prerenderFinalStatusPrerenderingDisabledByDevTools:"The prerender was not performed because DevTools has been used to disable prerendering.",prerenderFinalStatusSpeculationRuleRemoved:'The prerendered page was unloaded because the initiating page removed the corresponding prerender rule from <script type="speculationrules">.',prerenderFinalStatusActivatedWithAuxiliaryBrowsingContexts:"The prerender was not used because during activation time, there were other windows with an active opener reference to the initiating page, which is currently not supported.",prerenderFinalStatusMaxNumOfRunningEagerPrerendersExceeded:'The prerender whose eagerness is "eager" was not performed because the initiating page already has too many prerenders ongoing. Remove other speculation rules with "eager" to enable further prerendering.',prerenderFinalStatusMaxNumOfRunningEmbedderPrerendersExceeded:"The browser-triggered prerender was not performed because the initiating page already has too many prerenders ongoing.",prerenderFinalStatusMaxNumOfRunningNonEagerPrerendersExceeded:'The old non-eager prerender (with a "moderate" or "conservative" eagerness and triggered by hovering or clicking links) was automatically canceled due to starting a new non-eager prerender. It can be retriggered by interacting with the link again.',prerenderFinalStatusPrerenderingUrlHasEffectiveUrl:"The prerendering navigation failed because it has an effective URL that is different from its normal URL. (For example, the New Tab Page, or hosted apps.)",prerenderFinalStatusRedirectedPrerenderingUrlHasEffectiveUrl:"The prerendering navigation failed because it redirected to an effective URL that is different from its normal URL. (For example, the New Tab Page, or hosted apps.)",prerenderFinalStatusActivationUrlHasEffectiveUrl:"The prerender was not used because during activation time, navigation has an effective URL that is different from its normal URL. (For example, the New Tab Page, or hosted apps.)",prerenderFinalStatusJavaScriptInterfaceAdded:"The prerendered page was unloaded because a new JavaScript interface has been injected by WebView.addJavascriptInterface().",prerenderFinalStatusJavaScriptInterfaceRemoved:"The prerendered page was unloaded because a JavaScript interface has been removed by WebView.removeJavascriptInterface().",prerenderFinalStatusAllPrerenderingCanceled:"All prerendered pages were unloaded by the browser for some reason (For example, WebViewCompat.addWebMessageListener() was called during prerendering.)",prerenderFinalStatusWindowClosed:"The prerendered page was unloaded because it called window.close().",prerenderFinalStatusBrowsingDataRemoved:"The prerendered page was unloaded because browsing data was removed.",statusNotTriggered:"Not triggered",statusPending:"Pending",statusRunning:"Running",statusReady:"Ready",statusSuccess:"Success",statusFailure:"Failure"},Ee=g.i18n.registerUIStrings("panels/application/preloading/components/PreloadingString.ts",i),p=g.i18n.getLazilyComputedLocalizedString.bind(void 0,Ee),n=g.i18n.getLocalizedString.bind(void 0,Ee),c={PrefetchFailedIneligibleRedirect:{name:p(i.PrefetchFailedIneligibleRedirect)},PrefetchFailedInvalidRedirect:{name:p(i.PrefetchFailedInvalidRedirect)},PrefetchFailedMIMENotSupported:{name:p(i.PrefetchFailedMIMENotSupported)},PrefetchFailedNetError:{name:p(i.PrefetchFailedNetError)},PrefetchFailedNon2XX:{name:p(i.PrefetchFailedNon2XX)},PrefetchIneligibleRetryAfter:{name:p(i.PrefetchIneligibleRetryAfter)},PrefetchIsPrivacyDecoy:{name:p(i.PrefetchIsPrivacyDecoy)},PrefetchIsStale:{name:p(i.PrefetchIsStale)},PrefetchNotEligibleBrowserContextOffTheRecord:{name:p(i.PrefetchNotEligibleBrowserContextOffTheRecord)},PrefetchNotEligibleDataSaverEnabled:{name:p(i.PrefetchNotEligibleDataSaverEnabled)},PrefetchNotEligibleExistingProxy:{name:p(i.PrefetchNotEligibleExistingProxy)},PrefetchNotEligibleHostIsNonUnique:{name:p(i.PrefetchNotEligibleHostIsNonUnique)},PrefetchNotEligibleNonDefaultStoragePartition:{name:p(i.PrefetchNotEligibleNonDefaultStoragePartition)},PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy:{name:p(i.PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy)},PrefetchNotEligibleSchemeIsNotHttps:{name:p(i.PrefetchNotEligibleSchemeIsNotHttps)},PrefetchNotEligibleUserHasCookies:{name:p(i.PrefetchNotEligibleUserHasCookies)},PrefetchNotEligibleUserHasServiceWorker:{name:p(i.PrefetchNotEligibleUserHasServiceWorker)},PrefetchNotUsedCookiesChanged:{name:p(i.PrefetchNotUsedCookiesChanged)},PrefetchProxyNotAvailable:{name:p(i.PrefetchProxyNotAvailable)},PrefetchNotUsedProbeFailed:{name:p(i.PrefetchNotUsedProbeFailed)},PrefetchEvictedForNewerPrefetch:{name:p(i.PrefetchEvictedForNewerPrefetch)},PrefetchEvictedAfterCandidateRemoved:{name:p(i.PrefetchEvictedAfterCandidateRemoved)},PrefetchNotEligibleBatterySaverEnabled:{name:p(i.PrefetchNotEligibleBatterySaverEnabled)},PrefetchNotEligiblePreloadingDisabled:{name:p(i.PrefetchNotEligiblePreloadingDisabled)},PrefetchNotEligibleUserHasServiceWorkerNoFetchHandler:{name:()=>g.i18n.lockedString("Unknown")},PrefetchNotEligibleRedirectFromServiceWorker:{name:()=>g.i18n.lockedString("Unknown")},PrefetchNotEligibleRedirectToServiceWorker:{name:()=>g.i18n.lockedString("Unknown")},PrefetchEvictedAfterBrowsingDataRemoved:{name:p(i.PrefetchEvictedAfterBrowsingDataRemoved)}};function A({prefetchStatus:t},e){switch(t){case null:return null;case"PrefetchNotStarted":return null;case"PrefetchNotFinishedInTime":return null;case"PrefetchResponseUsed":return null;case"PrefetchAllowed":case"PrefetchHeldback":return null;case"PrefetchSuccessfulButNotUsed":return null;case"PrefetchFailedIneligibleRedirect":return c.PrefetchFailedIneligibleRedirect.name();case"PrefetchFailedInvalidRedirect":return c.PrefetchFailedInvalidRedirect.name();case"PrefetchFailedMIMENotSupported":return c.PrefetchFailedMIMENotSupported.name();case"PrefetchFailedNetError":return c.PrefetchFailedNetError.name();case"PrefetchFailedNon2XX":return e!==void 0?n(i.PrefetchFailedNon2XXWithStatusCode,{PH1:String(e)}):c.PrefetchFailedNon2XX.name();case"PrefetchIneligibleRetryAfter":return c.PrefetchIneligibleRetryAfter.name();case"PrefetchEvictedForNewerPrefetch":return c.PrefetchEvictedForNewerPrefetch.name();case"PrefetchEvictedAfterCandidateRemoved":return c.PrefetchEvictedAfterCandidateRemoved.name();case"PrefetchIsPrivacyDecoy":return c.PrefetchIsPrivacyDecoy.name();case"PrefetchIsStale":return c.PrefetchIsStale.name();case"PrefetchNotEligibleBrowserContextOffTheRecord":return c.PrefetchNotEligibleBrowserContextOffTheRecord.name();case"PrefetchNotEligibleDataSaverEnabled":return c.PrefetchNotEligibleDataSaverEnabled.name();case"PrefetchNotEligibleExistingProxy":return c.PrefetchNotEligibleExistingProxy.name();case"PrefetchNotEligibleHostIsNonUnique":return c.PrefetchNotEligibleHostIsNonUnique.name();case"PrefetchNotEligibleNonDefaultStoragePartition":return c.PrefetchNotEligibleNonDefaultStoragePartition.name();case"PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy":return c.PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy.name();case"PrefetchNotEligibleSchemeIsNotHttps":return c.PrefetchNotEligibleSchemeIsNotHttps.name();case"PrefetchNotEligibleUserHasCookies":return c.PrefetchNotEligibleUserHasCookies.name();case"PrefetchNotEligibleUserHasServiceWorker":return c.PrefetchNotEligibleUserHasServiceWorker.name();case"PrefetchNotUsedCookiesChanged":return c.PrefetchNotUsedCookiesChanged.name();case"PrefetchProxyNotAvailable":return c.PrefetchProxyNotAvailable.name();case"PrefetchNotUsedProbeFailed":return c.PrefetchNotUsedProbeFailed.name();case"PrefetchNotEligibleBatterySaverEnabled":return c.PrefetchNotEligibleBatterySaverEnabled.name();case"PrefetchNotEligiblePreloadingDisabled":return c.PrefetchNotEligiblePreloadingDisabled.name();case"PrefetchNotEligibleUserHasServiceWorkerNoFetchHandler":return c.PrefetchNotEligibleUserHasServiceWorkerNoFetchHandler.name();case"PrefetchNotEligibleRedirectFromServiceWorker":return c.PrefetchNotEligibleRedirectFromServiceWorker.name();case"PrefetchNotEligibleRedirectToServiceWorker":return c.PrefetchNotEligibleRedirectToServiceWorker.name();case"PrefetchEvictedAfterBrowsingDataRemoved":return c.PrefetchEvictedAfterBrowsingDataRemoved.name();default:return g.i18n.lockedString(`Unknown failure reason: ${t}`)}}function H(t,e){switch(t.prerenderStatus){case null:case"Activated":return null;case"Destroyed":return g.i18n.lockedString("Unknown");case"LowEndDevice":return n(i.prerenderFinalStatusLowEndDevice);case"InvalidSchemeRedirect":return n(i.prerenderFinalStatusInvalidSchemeRedirect);case"InvalidSchemeNavigation":return n(i.prerenderFinalStatusInvalidSchemeNavigation);case"NavigationRequestBlockedByCsp":return n(i.prerenderFinalStatusNavigationRequestBlockedByCsp);case"MojoBinderPolicy":return Ue(t.disallowedMojoInterface),n(i.prerenderFinalStatusMojoBinderPolicy,{PH1:t.disallowedMojoInterface});case"RendererProcessCrashed":return n(i.prerenderFinalStatusRendererProcessCrashed);case"RendererProcessKilled":return n(i.prerenderFinalStatusRendererProcessKilled);case"Download":return n(i.prerenderFinalStatusDownload);case"TriggerDestroyed":return g.i18n.lockedString("Internal error");case"NavigationNotCommitted":return g.i18n.lockedString("Internal error");case"NavigationBadHttpStatus":return e!==void 0?n(i.prerenderFinalStatusNavigationBadHttpStatusWithStatusCode,{PH1:String(e)}):n(i.prerenderFinalStatusNavigationBadHttpStatus);case"ClientCertRequested":return n(i.prerenderFinalStatusClientCertRequested);case"NavigationRequestNetworkError":return n(i.prerenderFinalStatusNavigationRequestNetworkError);case"CancelAllHostsForTesting":throw new Error("unreachable");case"DidFailLoad":return g.i18n.lockedString("Unknown");case"Stop":return g.i18n.lockedString("Unknown");case"SslCertificateError":return n(i.prerenderFinalStatusSslCertificateError);case"LoginAuthRequested":return n(i.prerenderFinalStatusLoginAuthRequested);case"UaChangeRequiresReload":return n(i.prerenderFinalStatusUaChangeRequiresReload);case"BlockedByClient":return n(i.prerenderFinalStatusBlockedByClient);case"AudioOutputDeviceRequested":return n(i.prerenderFinalStatusAudioOutputDeviceRequested);case"MixedContent":return n(i.prerenderFinalStatusMixedContent);case"TriggerBackgrounded":return n(i.prerenderFinalStatusTriggerBackgrounded);case"MemoryLimitExceeded":return n(i.prerenderFinalStatusMemoryLimitExceeded);case"DataSaverEnabled":return n(i.prerenderFinalStatusDataSaverEnabled);case"TriggerUrlHasEffectiveUrl":return n(i.prerenderFinalStatusHasEffectiveUrl);case"ActivatedBeforeStarted":return g.i18n.lockedString("Internal error");case"InactivePageRestriction":return g.i18n.lockedString("Internal error");case"StartFailed":return g.i18n.lockedString("Internal error");case"TimeoutBackgrounded":return n(i.prerenderFinalStatusTimeoutBackgrounded);case"CrossSiteRedirectInInitialNavigation":return n(i.prerenderFinalStatusCrossSiteRedirectInInitialNavigation);case"CrossSiteNavigationInInitialNavigation":return n(i.prerenderFinalStatusCrossSiteNavigationInInitialNavigation);case"SameSiteCrossOriginRedirectNotOptInInInitialNavigation":return n(i.prerenderFinalStatusSameSiteCrossOriginRedirectNotOptInInInitialNavigation);case"SameSiteCrossOriginNavigationNotOptInInInitialNavigation":return n(i.prerenderFinalStatusSameSiteCrossOriginNavigationNotOptInInInitialNavigation);case"ActivationNavigationParameterMismatch":return n(i.prerenderFinalStatusActivationNavigationParameterMismatch);case"ActivatedInBackground":return g.i18n.lockedString("Internal error");case"EmbedderHostDisallowed":throw new Error("unreachable");case"ActivationNavigationDestroyedBeforeSuccess":return g.i18n.lockedString("Internal error");case"TabClosedByUserGesture":throw new Error("unreachable");case"TabClosedWithoutUserGesture":throw new Error("unreachable");case"PrimaryMainFrameRendererProcessCrashed":return n(i.prerenderFinalStatusPrimaryMainFrameRendererProcessCrashed);case"PrimaryMainFrameRendererProcessKilled":return n(i.prerenderFinalStatusPrimaryMainFrameRendererProcessKilled);case"ActivationFramePolicyNotCompatible":return n(i.prerenderFinalStatusActivationFramePolicyNotCompatible);case"PreloadingDisabled":return n(i.prerenderFinalStatusPreloadingDisabled);case"BatterySaverEnabled":return n(i.prerenderFinalStatusBatterySaverEnabled);case"ActivatedDuringMainFrameNavigation":return n(i.prerenderFinalStatusActivatedDuringMainFrameNavigation);case"PreloadingUnsupportedByWebContents":throw new Error("unreachable");case"CrossSiteRedirectInMainFrameNavigation":return n(i.prerenderFinalStatusCrossSiteRedirectInMainFrameNavigation);case"CrossSiteNavigationInMainFrameNavigation":return n(i.prerenderFinalStatusCrossSiteNavigationInMainFrameNavigation);case"SameSiteCrossOriginRedirectNotOptInInMainFrameNavigation":return n(i.prerenderFinalStatusSameSiteCrossOriginRedirectNotOptInInMainFrameNavigation);case"SameSiteCrossOriginNavigationNotOptInInMainFrameNavigation":return n(i.prerenderFinalStatusSameSiteCrossOriginNavigationNotOptInInMainFrameNavigation);case"MemoryPressureOnTrigger":return n(i.prerenderFinalStatusMemoryPressureOnTrigger);case"MemoryPressureAfterTriggered":return n(i.prerenderFinalStatusMemoryPressureAfterTriggered);case"PrerenderingDisabledByDevTools":return n(i.prerenderFinalStatusPrerenderingDisabledByDevTools);case"SpeculationRuleRemoved":return n(i.prerenderFinalStatusSpeculationRuleRemoved);case"ActivatedWithAuxiliaryBrowsingContexts":return n(i.prerenderFinalStatusActivatedWithAuxiliaryBrowsingContexts);case"MaxNumOfRunningEagerPrerendersExceeded":return n(i.prerenderFinalStatusMaxNumOfRunningEagerPrerendersExceeded);case"MaxNumOfRunningEmbedderPrerendersExceeded":return n(i.prerenderFinalStatusMaxNumOfRunningEmbedderPrerendersExceeded);case"MaxNumOfRunningNonEagerPrerendersExceeded":return n(i.prerenderFinalStatusMaxNumOfRunningNonEagerPrerendersExceeded);case"PrerenderingUrlHasEffectiveUrl":return n(i.prerenderFinalStatusPrerenderingUrlHasEffectiveUrl);case"RedirectedPrerenderingUrlHasEffectiveUrl":return n(i.prerenderFinalStatusRedirectedPrerenderingUrlHasEffectiveUrl);case"ActivationUrlHasEffectiveUrl":return n(i.prerenderFinalStatusActivationUrlHasEffectiveUrl);case"JavaScriptInterfaceAdded":return n(i.prerenderFinalStatusJavaScriptInterfaceAdded);case"JavaScriptInterfaceRemoved":return n(i.prerenderFinalStatusJavaScriptInterfaceRemoved);case"AllPrerenderingCanceled":return n(i.prerenderFinalStatusAllPrerenderingCanceled);case"WindowClosed":return n(i.prerenderFinalStatusWindowClosed);case"BrowsingDataRemoved":return n(i.prerenderFinalStatusBrowsingDataRemoved);case"SlowNetwork":case"OtherPrerenderedPageActivated":case"V8OptimizerDisabled":case"PrerenderFailedDuringPrefetch":return"";default:return g.i18n.lockedString(`Unknown failure reason: ${t.prerenderStatus}`)}}function se(t,e){let r=t.url===void 0?e:t.url;return Ie.ResourceUtils.displayNameForURL(r)}function J(t,e){return!t.errorMessage&&t.tag?'"'+t.tag+'"':se(t,e)}function $(t){switch(t){case"Prefetch":return g.i18n.lockedString("Prefetch");case"Prerender":return g.i18n.lockedString("Prerender");case"PrerenderUntilScript":return g.i18n.lockedString("Prerender until script")}}function xe(t){switch(t.status){case"NotSupported":return 0;case"Pending":return 1;case"Running":return 2;case"Ready":return 3;case"Success":return 4;case"Failure":switch(t.action){case"Prefetch":return 5;case"Prerender":return 6;case"PrerenderUntilScript":return 7}case"NotTriggered":return 8;default:Te.assertNever(t.status,"Unknown Preloading attempt status")}}function wt(t){switch(t){case"NotTriggered":return n(i.statusNotTriggered);case"Pending":return n(i.statusPending);case"Running":return n(i.statusRunning);case"Ready":return n(i.statusReady);case"Success":return n(i.statusSuccess);case"Failure":return n(i.statusFailure);case"NotSupported":return g.i18n.lockedString("Internal error")}}function De(t,e){let r=wt(t.status);if(t.status!=="Failure")return r;switch(t.action){case"Prefetch":{let a=A(t,e)??g.i18n.lockedString("Internal error");return r+" - "+a}case"Prerender":case"PrerenderUntilScript":{let a=H(t,e);return Ue(a),r+" - "+a}}}var{charDiff:Nt}=U.Diff.DiffWrapper,{render:Ft,html:C,Directives:{styleMap:oe}}=Rt,F={url:"URL",action:"Action",status:"Status",statusNotTriggered:"Not triggered",statusPending:"Pending",statusRunning:"Running",statusReady:"Ready",statusSuccess:"Success",statusFailure:"Failure"},kt=Q.i18n.registerUIStrings("panels/application/preloading/components/MismatchedPreloadingGrid.ts",F),k=Q.i18n.getLocalizedString.bind(void 0,kt),de=class{static status(e){switch(e){case"NotTriggered":return k(F.statusNotTriggered);case"Pending":return k(F.statusPending);case"Running":return k(F.statusRunning);case"Ready":return k(F.statusReady);case"Success":return k(F.statusSuccess);case"Failure":return k(F.statusFailure);case"NotSupported":return Q.i18n.lockedString("Internal error")}}},Ce=(t,e,r)=>{Ft(C`
    <devtools-data-grid striped inline>
      <table>
        <tr>
          <th id="url" weight="40" sortable>
            ${k(F.url)}
          </th>
          <th id="action" weight="15" sortable>
            ${k(F.action)}
          </th>
          <th id="status" weight="15" sortable>
            ${k(F.status)}
          </th>
        </tr>
        ${t.rows.map(a=>({row:a,diffScore:U.Diff.DiffWrapper.characterScore(a.url,t.pageURL)})).sort((a,d)=>d.diffScore-a.diffScore).map(({row:a})=>C`
              <tr>
                <td>
                  <div>${Nt(a.url,t.pageURL).map(d=>{let o=d[1];switch(d[0]){case U.Diff.Operation.Equal:return C`<span>${o}</span>`;case U.Diff.Operation.Insert:return C`<span style=${oe({color:"var(--sys-color-green)","text-decoration":"line-through"})}
                              >${o}</span>`;case U.Diff.Operation.Delete:return C`<span style=${oe({color:"var(--sys-color-error)"})}>${o}</span>`;case U.Diff.Operation.Edit:return C`<span style=${oe({color:"var(--sys-color-green","text-decoration":"line-through"})}
                          >${o}</span>`;default:throw new Error("unreachable")}})}
                  </div>
                </td>
                <td>${$(a.action)}</td>
                <td>${de.status(a.status)}</td>
              </tr>
            `)}
      </table>
    </devtools-data-grid>`,r)},O=class extends $e.Widget.Widget{#t=null;#e;constructor(e,r=Ce){super(e,{classes:["devtools-resources-mismatched-preloading-grid"],useShadowDom:!0}),this.#e=r}wasShown(){super.wasShown(),this.requestUpdate()}set data(e){this.#t=e,this.requestUpdate()}performUpdate(){this.#t&&this.#e(this.#t,{},this.contentElement)}};var We={};T(We,{PreloadingDetailsReportView:()=>ee});import"./../../../../ui/components/report_view/report_view.js";import"./../../../../ui/components/request_link_icon/request_link_icon.js";import*as Me from"./../../../../core/common/common.js";import*as j from"./../../../../core/i18n/i18n.js";import{assertNotNullOrUndefined as I}from"./../../../../core/platform/platform.js";import*as W from"./../../../../core/sdk/sdk.js";import*as Ae from"./../../../../models/logs/logs.js";import"./../../../../ui/components/buttons/buttons.js";import*as He from"./../../../../ui/components/legacy_wrapper/legacy_wrapper.js";import*as Oe from"./../../../../ui/components/render_coordinator/render_coordinator.js";import*as q from"./../../../../ui/legacy/legacy.js";import*as b from"./../../../../ui/lit/lit.js";import*as V from"./../../../../ui/visual_logging/visual_logging.js";import*as Y from"./../helper/helper.js";var le=`:host{display:flex;height:100%}devtools-report{flex-grow:1}button.link{color:var(--sys-color-primary);text-decoration:underline;padding:0;border:none;background:none;font-family:inherit;font-size:inherit;height:16px}button.link devtools-icon{vertical-align:sub}.link{color:var(--sys-color-primary);text-decoration:underline;cursor:pointer}
/*# sourceURL=${import.meta.resolve("./preloadingDetailsReportView.css")} */`;var{html:w}=b,h={noElementSelected:"No element selected",selectAnElementForMoreDetails:"Select an element for more details",detailsDetailedInformation:"Detailed information",detailsAction:"Action",detailsStatus:"Status",detailsTargetHint:"Target hint",detailsFailureReason:"Failure reason",detailsRuleSet:"Rule set",automaticallyFellBackToPrefetch:"(automatically fell back to prefetch)",detailedStatusNotTriggered:"Speculative load attempt is not yet triggered.",detailedStatusPending:"Speculative load attempt is eligible but pending.",detailedStatusRunning:"Speculative load is running.",detailedStatusReady:"Speculative load finished and the result is ready for the next navigation.",detailedStatusSuccess:"Speculative load finished and used for a navigation.",detailedStatusFailure:"Speculative load failed.",detailedStatusFallbackToPrefetch:"Speculative load failed, but fallback to prefetch succeeded.",buttonInspect:"Inspect",buttonClickToInspect:"Click to inspect prerendered page",buttonClickToRevealRuleSet:"Click to reveal rule set"},Tt=j.i18n.registerUIStrings("panels/application/preloading/components/PreloadingDetailsReportView.ts",h),f=j.i18n.getLocalizedString.bind(void 0,Tt),Z=class{static detailedStatus({status:e}){switch(e){case"NotTriggered":return f(h.detailedStatusNotTriggered);case"Pending":return f(h.detailedStatusPending);case"Running":return f(h.detailedStatusRunning);case"Ready":return f(h.detailedStatusReady);case"Success":return f(h.detailedStatusSuccess);case"Failure":return f(h.detailedStatusFailure);case"NotSupported":return j.i18n.lockedString("Internal error")}}static detailedTargetHint(e){switch(I(e.targetHint),e.targetHint){case"Blank":return"_blank";case"Self":return"_self"}}},ee=class extends He.LegacyWrapper.WrappableComponent{#t=this.attachShadow({mode:"open"});#e=null;set data(e){this.#e=e,this.#r()}async#r(){await Oe.write("PreloadingDetailsReportView render",()=>{if(this.#e===null){b.render(w`
          <style>${le}</style>
          <style>${q.inspectorCommonStyles}</style>
          <div class="empty-state">
            <span class="empty-state-header">${f(h.noElementSelected)}</span>
            <span class="empty-state-description">${f(h.selectAnElementForMoreDetails)}</span>
          </div>
        `,this.#t,{host:this});return}let e=this.#e.pipeline,r=this.#e.pageURL,a=e.getPrerender()?.status==="Failure"&&(e.getPrefetch()?.status==="Ready"||e.getPrefetch()?.status==="Success");b.render(w`
        <style>${le}</style>
        <style>${q.inspectorCommonStyles}</style>
        <devtools-report
          .data=${{reportTitle:"Speculative Loading Attempt"}}
          jslog=${V.section("preloading-details")}>
          <devtools-report-section-header>${f(h.detailsDetailedInformation)}</devtools-report-section-header>

          ${this.#i()}
          ${this.#n(a)}
          ${this.#s(a)}
          ${this.#d()}
          ${this.#o()}
          ${this.#l()}

          ${this.#e.ruleSets.map(d=>this.#c(d,r))}
        </devtools-report>
      `,this.#t,{host:this})})}#i(){I(this.#e);let e=this.#e.pipeline.getOriginallyTriggered(),r=this.#e.pipeline.getPrefetch()?.status,a;if(e.action==="Prefetch"&&e.requestId!==void 0&&r!=="NotTriggered"){let{requestId:d,key:{url:o}}=e;a=w`
          <devtools-request-link-icon
            .data=${{affectedRequest:{requestId:d,url:o},requestResolver:this.#e.requestResolver||new Ae.RequestResolver.RequestResolver,displayURL:!0,urlToDisplay:o}}
          >
          </devtools-request-link-icon>
      `}else a=w`
          <div class="text-ellipsis" title=${e.key.url}>${e.key.url}</div>
      `;return w`
        <devtools-report-key>${j.i18n.lockedString("URL")}</devtools-report-key>
        <devtools-report-value>
          ${a}
        </devtools-report-value>
    `}#a(e){return["Prerender","PrerenderUntilScript"].includes(e)}#n(e){I(this.#e);let r=this.#e.pipeline.getOriginallyTriggered(),a=$(r.action),d=b.nothing;e&&(d=w`${f(h.automaticallyFellBackToPrefetch)}`);let o=b.nothing;return(()=>{if(!this.#a(r.action)||W.TargetManager.TargetManager.instance().primaryPageTarget()===null)return;let m=W.TargetManager.TargetManager.instance().targets().find(S=>S.targetInfo()?.subtype==="prerender"&&S.inspectedURL()===r.key.url),N=m===void 0;o=w`
          <devtools-button
            @click=${()=>{m!==void 0&&q.Context.Context.instance().setFlavor(W.Target.Target,m)}}
            .title=${f(h.buttonClickToInspect)}
            .size=${"SMALL"}
            .variant=${"outlined"}
            .disabled=${N}
            jslog=${V.action("inspect-prerendered-page").track({click:!0})}
          >
            ${f(h.buttonInspect)}
          </devtools-button>
      `})(),w`
        <devtools-report-key>${f(h.detailsAction)}</devtools-report-key>
        <devtools-report-value>
          <div class="text-ellipsis" title="">
            ${a} ${d} ${o}
          </div>
        </devtools-report-value>
    `}#s(e){I(this.#e);let r=this.#e.pipeline.getOriginallyTriggered(),a=e?f(h.detailedStatusFallbackToPrefetch):Z.detailedStatus(r);return w`
        <devtools-report-key>${f(h.detailsStatus)}</devtools-report-key>
        <devtools-report-value>
          ${a}
        </devtools-report-value>
    `}#o(){I(this.#e);let e=this.#e.pipeline.getOriginallyTriggered();if(e.action!=="Prefetch")return b.nothing;let r=Y.PreloadingForward.preloadStatusCode(e),a=A(e,r);return a===null?b.nothing:w`
        <devtools-report-key>${f(h.detailsFailureReason)}</devtools-report-key>
        <devtools-report-value>
          ${a}
        </devtools-report-value>
    `}#d(){I(this.#e);let e=this.#e.pipeline.getOriginallyTriggered();return this.#a(e.action)&&e.key.targetHint!==void 0?w`
        <devtools-report-key>${f(h.detailsTargetHint)}</devtools-report-key>
        <devtools-report-value>
          ${Z.detailedTargetHint(e.key)}
        </devtools-report-value>
    `:b.nothing}#l(){I(this.#e);let e=this.#e.pipeline.getOriginallyTriggered();if(!this.#a(e.action))return b.nothing;let r=Y.PreloadingForward.preloadStatusCode(e),a=H(e,r);return a===null?b.nothing:w`
        <devtools-report-key>${f(h.detailsFailureReason)}</devtools-report-key>
        <devtools-report-value>
          ${a}
        </devtools-report-value>
    `}#c(e,r){let a=()=>{Me.Revealer.reveal(new Y.PreloadingForward.RuleSetView(e.id))},d=se(e,r);return w`
      <devtools-report-key>${f(h.detailsRuleSet)}</devtools-report-key>
      <devtools-report-value>
        <div class="text-ellipsis" title="">
          <button class="link" role="link"
            @click=${a}
            title=${f(h.buttonClickToRevealRuleSet)}
            style=${b.Directives.styleMap({color:"var(--sys-color-primary)","text-decoration":"underline"})}
            jslog=${V.action("reveal-rule-set").track({click:!0})}
          >
            ${d}
          </button>
        </div>
      </devtools-report-value>
    `}};customElements.define("devtools-resources-preloading-details-report-view",ee);var Xe={};T(Xe,{DEFAULT_VIEW:()=>Ge,PreloadingDisabledInfobar:()=>ue});import"./../../../../ui/components/report_view/report_view.js";import"./../../../../ui/kit/kit.js";import*as pe from"./../../../../core/i18n/i18n.js";import*as je from"./../../../../core/platform/platform.js";import"./../../../../ui/components/buttons/buttons.js";import"./../../../../ui/components/dialogs/dialogs.js";import*as ze from"./../../../../ui/legacy/legacy.js";import{html as ce,i18nTemplate as Ut,nothing as It,render as Et}from"./../../../../ui/lit/lit.js";import*as _e from"./../../../../ui/visual_logging/visual_logging.js";var qe=`#container{padding:6px 12px;border-bottom:1px solid var(--sys-color-divider);align-items:center;display:flex}#contents .key{grid-column-start:span 2;font-weight:bold}#contents .value{grid-column-start:span 2;margin-top:var(--sys-size-6)}#footer{margin-top:var(--sys-size-6);margin-bottom:var(--sys-size-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;grid-column-start:span 2}devtools-link{color:var(--sys-color-primary);text-decoration-line:underline}
/*# sourceURL=${import.meta.resolve("./preloadingDisabledInfobar.css")} */`;var{urlString:Ve}=je.DevToolsPath,v={infobarPreloadingIsDisabled:"Speculative loading is disabled",infobarPreloadingIsForceEnabled:"Speculative loading is force-enabled",titleReasonsPreventingPreloading:"Reasons preventing speculative loading",headerDisabledByPreference:"User settings or extensions",descriptionDisabledByPreference:"Speculative loading is disabled because of user settings or an extension. Go to {PH1} to update your preference. Go to {PH2} to disable any extension that blocks speculative loading.",preloadingPagesSettings:"Preload pages settings",extensionsSettings:"Extensions settings",headerDisabledByDataSaver:"Data Saver",descriptionDisabledByDataSaver:"Speculative loading is disabled because of the operating system's Data Saver mode.",headerDisabledByBatterySaver:"Battery Saver",descriptionDisabledByBatterySaver:"Speculative loading is disabled because of the operating system's Battery Saver mode.",headerDisabledByHoldbackPrefetchSpeculationRules:"Prefetch was disabled, but is force-enabled now",descriptionDisabledByHoldbackPrefetchSpeculationRules:"Prefetch is forced-enabled because DevTools is open. When DevTools is closed, prefetch will be disabled because this browser session is part of a holdback group used for performance comparisons.",headerDisabledByHoldbackPrerenderSpeculationRules:"Prerendering was disabled, but is force-enabled now",descriptionDisabledByHoldbackPrerenderSpeculationRules:"Prerendering is forced-enabled because DevTools is open. When DevTools is closed, prerendering will be disabled because this browser session is part of a holdback group used for performance comparisons.",footerLearnMore:"Learn more"},Ke=pe.i18n.registerUIStrings("panels/application/preloading/components/PreloadingDisabledInfobar.ts",v),R=pe.i18n.getLocalizedString.bind(void 0,Ke),xt="https://developer.chrome.com/blog/prerender-pages/",Ge=(t,e,r)=>{let a=It;t.header!==null&&(a=ce`
        <style>${qe}</style>
        <div id="container">
          <span id="header">${t.header}</span>
          <devtools-button-dialog .data=${{iconName:"info",variant:"icon",closeButton:!0,position:"auto",horizontalAlignment:"auto",closeOnESC:!0,closeOnScroll:!1,dialogTitle:R(v.titleReasonsPreventingPreloading)}}
                                  jslog=${_e.dialog("preloading-disabled").track({resize:!0,keydown:"Escape"})}>
            <div id="contents">
              <devtools-report>
                ${t.warnings.map(({key:d,valueId:o,placeholders:s={}})=>{let m=Ut(Ke,o,Object.fromEntries(Object.entries(s).map(([N,{title:y,href:S}])=>[N,ce`<devtools-link href=${S}>${y}</devtools-link>`])));return ce`
                      <div class="key">${d}</div>
                      <div class="value">${m}</div>
                    `})}
              </devtools-report>
              <div id="footer">
                <devtools-link href=${xt} jslogcontext="learn-more">
                  ${R(v.footerLearnMore)}
                </devtools-link>
              </div>
            </div>
          </devtools-button-dialog>
        </div>`),Et(a,r)},ue=class extends ze.Widget.VBox{#t;#e=!1;#r=!1;#i=!1;#a=!1;#n=!1;constructor(e=Ge){super({useShadowDom:!0}),this.#t=e}get disabledByPreference(){return this.#e}set disabledByPreference(e){this.#e!==e&&(this.#e=e,this.requestUpdate())}get disabledByDataSaver(){return this.#r}set disabledByDataSaver(e){this.#r!==e&&(this.#r=e,this.requestUpdate())}get disabledByBatterySaver(){return this.#i}set disabledByBatterySaver(e){this.#i!==e&&(this.#i=e,this.requestUpdate())}get disabledByHoldbackPrefetchSpeculationRules(){return this.#a}set disabledByHoldbackPrefetchSpeculationRules(e){this.#a!==e&&(this.#a=e,this.requestUpdate())}get disabledByHoldbackPrerenderSpeculationRules(){return this.#n}set disabledByHoldbackPrerenderSpeculationRules(e){this.#n!==e&&(this.#n=e,this.requestUpdate())}wasShown(){super.wasShown(),this.requestUpdate()}performUpdate(){let e=null;this.#e||this.#r||this.#i?e=R(v.infobarPreloadingIsDisabled):(this.#a||this.#n)&&(e=R(v.infobarPreloadingIsForceEnabled));let r=[];this.#e&&r.push({key:R(v.headerDisabledByPreference),valueId:v.descriptionDisabledByPreference,placeholders:{PH1:{title:R(v.preloadingPagesSettings),href:Ve`chrome://settings/performance`},PH2:{title:R(v.extensionsSettings),href:Ve`chrome://extensions`}}}),this.#r&&r.push({key:R(v.headerDisabledByDataSaver),valueId:v.descriptionDisabledByDataSaver}),this.#i&&r.push({key:R(v.headerDisabledByBatterySaver),valueId:v.descriptionDisabledByBatterySaver}),this.#a&&r.push({key:R(v.headerDisabledByHoldbackPrefetchSpeculationRules),valueId:v.descriptionDisabledByHoldbackPrefetchSpeculationRules}),this.#n&&r.push({key:R(v.headerDisabledByHoldbackPrerenderSpeculationRules),valueId:v.descriptionDisabledByHoldbackPrerenderSpeculationRules});let a={header:e,warnings:r};this.#t(a,void 0,this.contentElement)}};var rt={};T(rt,{PRELOADING_GRID_DEFAULT_VIEW:()=>tt,PreloadingGrid:()=>he,i18nString:()=>_});import"./../../../../ui/legacy/components/data_grid/data_grid.js";import"./../../../../ui/kit/kit.js";import*as Ye from"./../../../../core/common/common.js";import*as re from"./../../../../core/i18n/i18n.js";import*as Ze from"./../../../../core/sdk/sdk.js";import*as et from"./../../../../ui/legacy/legacy.js";import*as Dt from"./../../../../ui/lit/lit.js";var te=`@scope to (devtools-widget > *){.preloading-container{overflow:auto;height:100%;display:flex;flex-direction:column;devtools-data-grid{flex:auto}.inline-icon{vertical-align:text-bottom}}.preloading-header{font-size:15px;background-color:var(--sys-color-cdt-base-container);padding:1px 4px}.preloading-placeholder{flex-grow:1;display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--sys-color-token-subtle)}}
/*# sourceURL=${import.meta.resolve("./preloadingGrid.css")} */`;var{PreloadingStatus:Rr}=Ze.PreloadingModel,z={action:"Action",ruleSet:"Rule set",status:"Status",prefetchFallbackReady:"Prefetch fallback ready"},Lt=re.i18n.registerUIStrings("panels/application/preloading/components/PreloadingGrid.ts",z),_=re.i18n.getLocalizedString.bind(void 0,Lt),{render:Je,html:ge,nothing:$t,Directives:{styleMap:Qe}}=Dt;function Ct(t,e){let r=t.pipeline.getOriginallyTriggered().key.url;return e&&r.startsWith(e)?r.slice(e.length):r}var tt=(t,e,r)=>{if(!t.rows||!t.pageURL){Je($t,r);return}let{rows:a,pageURL:d}=t,o=d===""?null:new Ye.ParsedURL.ParsedURL(d).securityOrigin();Je(ge`
    <style>${te}</style>
    <div class="preloading-container">
      <devtools-data-grid striped>
        <table>
          <tr>
            <th id="url" weight="40" sortable>${re.i18n.lockedString("URL")}</th>
            <th id="action" weight="15" sortable>${_(z.action)}</th>
            <th id="rule-set" weight="20" sortable>${_(z.ruleSet)}</th>
            <th id="status" weight="40" sortable>${_(z.status)}</th>
          </tr>
          ${a.map(s=>{let m=s.pipeline.getOriginallyTriggered(),N=s.pipeline.getPrefetch()?.status,S=s.pipeline.getPrerender()?.status==="Failure"&&(N==="Ready"||N==="Success"),ke=s.pipeline.getOriginallyTriggered().status==="Failure";return ge`<tr @select=${()=>t.onSelect?.({rowId:s.id})}>
              <td title=${m.key.url}>${Ct(s,o)}</td>
              <td>${$(m.action)}</td>
              <td>${s.ruleSets.length===0?"":J(s.ruleSets[0],d)}</td>
              <td data-value=${xe(m)}>
                <div style=${Qe({color:S?"var(--sys-color-orange-bright)":ke?"var(--sys-color-error)":"var(--sys-color-on-surface)"})}>
                  ${ke||S?ge`
                    <devtools-icon
                      name=${S?"warning-filled":"cross-circle-filled"}
                      class='medium'
                      style=${Qe({"vertical-align":"sub"})}
                    ></devtools-icon>`:""}
                  ${S?_(z.prefetchFallbackReady):De(m,s.statusCode)}
                </div>
              </td>
            </tr>`})}
        </table>
      </devtools-data-grid>
    </div>
  `,r)},he=class extends et.Widget.VBox{#t;#e;#r;#i;constructor(e){super(),this.#t=e??tt,this.requestUpdate()}set rows(e){this.#e=e,this.requestUpdate()}set pageURL(e){this.#r=e,this.requestUpdate()}set onSelect(e){this.#i=e,this.requestUpdate()}performUpdate(){let e={rows:this.#e,pageURL:this.#r,onSelect:this.#i?.bind(this)};this.#t(e,void 0,this.contentElement)}};var lt={};T(lt,{DEFAULT_VIEW:()=>dt,RuleSetDetailsView:()=>me});import*as ve from"./../../../../core/i18n/i18n.js";import*as nt from"./../../../../core/sdk/sdk.js";import*as st from"./../../../../models/formatter/formatter.js";import*as E from"./../../../../third_party/codemirror.next/codemirror.next.js";import*as Se from"./../../../../ui/components/code_highlighter/code_highlighter.js";import*as ot from"./../../../../ui/components/text_editor/text_editor.js";import*as ae from"./../../../../ui/legacy/legacy.js";import{html as ie,nothing as Bt,render as Mt}from"./../../../../ui/lit/lit.js";var it=`:host{height:100%}.placeholder{display:flex;height:100%}.ruleset-header-container{flex-shrink:0}.ruleset-header{padding:4px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-bottom:1px solid var(--sys-color-divider)}.ruleset-header devtools-icon{vertical-align:sub}.text-editor-container{overflow:auto}
/*# sourceURL=${import.meta.resolve("./RuleSetDetailsView.css")} */`;var fe={noElementSelected:"No element selected",selectAnElementForMoreDetails:"Select an element for more details"},At=ve.i18n.registerUIStrings("panels/application/preloading/components/RuleSetDetailsView.ts",fe),at=ve.i18n.getLocalizedString.bind(void 0,At),Ht=await Se.CodeHighlighter.languageFromMIME("application/json"),dt=(t,e,r)=>{Mt(ie`
    <style>${it}</style>
    <style>${ae.inspectorCommonStyles}</style>
    ${t?ie`
        <div class="ruleset-header-container">
          <div class="ruleset-header" id="ruleset-url">${t.url}</div>
          ${t.errorMessage?ie`
            <div class="ruleset-header">
              <devtools-icon name="cross-circle" class="medium">
              </devtools-icon>
              <span id="error-message-text">${t.errorMessage}</span>
            </div>
          `:Bt}
        </div>
        <div class="text-editor-container">
          <devtools-text-editor .state=${t.editorState}></devtools-text-editor>
        </div>`:ie`
          <div class="placeholder">
            <div class="empty-state">
              <span class="empty-state-header">${at(fe.noElementSelected)}</span>
              <span class="empty-state-description">${at(fe.selectAnElementForMoreDetails)}</span>
            </div>
          </div>`}
    `,r)},me=class extends ae.Widget.VBox{#t;#e=null;#r=!0;constructor(e,r=dt){super(e,{useShadowDom:!0}),this.#t=r}wasShown(){super.wasShown(),this.requestUpdate()}set ruleSet(e){this.#e=e,this.requestUpdate()}set shouldPrettyPrint(e){this.#r=e,this.requestUpdate()}async performUpdate(){if(!this.#e){this.#t(null,{},this.contentElement);return}let e=await this.#i(),r=E.EditorState.create({doc:e,extensions:[ot.Config.baseConfiguration(e),E.lineNumbers(),E.EditorState.readOnly.of(!0),Ht,E.syntaxHighlighting(Se.CodeHighlighter.highlightStyle)]});this.#t({url:this.#e.url||nt.TargetManager.TargetManager.instance().inspectedURL(),errorMessage:this.#e.errorMessage,editorState:r,sourceText:e},{},this.contentElement)}async#i(){return this.#r&&this.#e?.sourceText!==void 0?(await st.ScriptFormatter.formatScriptContent("application/json",this.#e.sourceText)).formattedContent:this.#e?.sourceText||""}};var mt={};T(mt,{DEFAULT_VIEW:()=>ft,RuleSetGrid:()=>be,i18nString:()=>D});import"./../../../../ui/legacy/components/data_grid/data_grid.js";import"./../../../../ui/kit/kit.js";import*as B from"./../../../../core/common/common.js";import*as Pe from"./../../../../core/i18n/i18n.js";import{assertNotNullOrUndefined as ut}from"./../../../../core/platform/platform.js";import*as L from"./../../../../core/sdk/sdk.js";import*as pt from"./../../../../ui/legacy/legacy.js";import{Directives as Ot,html as K,nothing as Wt,render as qt}from"./../../../../ui/lit/lit.js";import*as G from"./../../../../ui/visual_logging/visual_logging.js";import*as gt from"./../../../network/forward/forward.js";import*as ht from"./../helper/helper.js";var ct=`:host{overflow:auto;height:100%}.ruleset-container{height:100%;display:flex;flex-direction:column}devtools-data-grid{flex:auto}.inline-icon{vertical-align:text-bottom}
/*# sourceURL=${import.meta.resolve("./ruleSetGrid.css")} */`;var{styleMap:ne}=Ot,x={ruleSet:"Rule set",status:"Status",clickToOpenInElementsPanel:"Click to open in Elements panel",clickToOpenInNetworkPanel:"Click to open in Network panel",errors:"{errorCount, plural, =1 {# error} other {# errors}}",buttonRevealPreloadsAssociatedWithRuleSet:"Reveal speculative loads associated with this rule set"},Vt=Pe.i18n.registerUIStrings("panels/application/preloading/components/RuleSetGrid.ts",x),D=Pe.i18n.getLocalizedString.bind(void 0,Vt),ft=(t,e,r)=>{let a=Wt;if(t.data!==null){let{rows:d,pageURL:o}=t.data;a=K`
          <style>${ct}</style>
          <div class="ruleset-container" jslog=${G.pane("preloading-rules")}>
            <devtools-data-grid striped>
              <table>
                <tr>
                  <th id="rule-set" weight="20" sortable>
                    ${D(x.ruleSet)}
                  </th>
                  <th id="status" weight="80" sortable>
                    ${D(x.status)}
                  </th>
                </tr>
                ${d.map(({ruleSet:s,preloadsStatusSummary:m})=>{let N=J(s,o),y=s.backendNodeId!==void 0,S=s.url!==void 0&&s.requestId;return K`
                    <tr @select=${()=>t.onSelect(s.id)}>
                      <td>
                        ${y||S?K`
                          <button class="link" role="link"
                              @click=${()=>{y?t.onRevealInElements(s):t.onRevealInNetwork(s)}}
                              title=${D(y?x.clickToOpenInElementsPanel:x.clickToOpenInNetworkPanel)}
                              style=${ne({border:"none",background:"none",color:"var(--icon-link)",cursor:"pointer","text-decoration":"underline","padding-inline-start":"0","padding-inline-end":"0"})}
                              jslog=${G.action(y?"reveal-in-elements":"reveal-in-network").track({click:!0})}
                            >
                              <devtools-icon name=${y?"code-circle":"arrow-up-down-circle"} class="medium"
                                style=${ne({color:"var(--icon-link)","vertical-align":"sub"})}
                              ></devtools-icon>
                              ${N}
                            </button>`:N}
                    </td>
                    <td>
                      ${s.errorType!==void 0?K`
                        <span style=${ne({color:"var(--sys-color-error)"})}>
                          ${D(x.errors,{errorCount:1})}
                        </span>`:""} ${s.errorType!=="SourceIsNotJsonObject"&&s.errorType!=="InvalidRulesetLevelTag"?K`
                        <button class="link" role="link"
                          @click=${()=>t.onRevealPreloadsAssociatedWithRuleSet(s)}
                          title=${D(x.buttonRevealPreloadsAssociatedWithRuleSet)}
                          style=${ne({color:"var(--sys-color-primary)","text-decoration":"underline",cursor:"pointer",border:"none",background:"none","padding-inline-start":"0","padding-inline-end":"0"})}
                          jslog=${G.action("reveal-preloads").track({click:!0})}>
                          ${m}
                        </button>`:""}
                    </td>
                  </tr>
                `})}
              </table>
            </devtools-data-grid>
          </div>`}qt(a,r)},be=class extends B.ObjectWrapper.eventMixin(pt.Widget.VBox){#t;#e=null;constructor(e=ft){super({useShadowDom:!0}),this.#t=e}get data(){return this.#e}set data(e){this.#e=e,this.requestUpdate()}performUpdate(){let e={data:this.#e,onSelect:this.dispatchEventToListeners.bind(this,"select"),onRevealInElements:this.#r.bind(this),onRevealInNetwork:this.#i.bind(this),onRevealPreloadsAssociatedWithRuleSet:this.#a.bind(this)};this.#t(e,void 0,this.contentElement)}#r(e){ut(e.backendNodeId);let r=L.TargetManager.TargetManager.instance().scopeTarget();r!==null&&B.Revealer.reveal(new L.DOMModel.DeferredDOMNode(r,e.backendNodeId))}#i(e){ut(e.requestId);let r=L.TargetManager.TargetManager.instance().scopeTarget()?.model(L.NetworkManager.NetworkManager)?.requestForId(e.requestId)||null;if(r===null)return;let a=gt.UIRequestLocation.UIRequestLocation.tab(r,"preview",{clearFilter:!1});B.Revealer.reveal(a)}#a(e){B.Revealer.reveal(new ht.PreloadingForward.AttemptViewWithFilter(e.id))}};var Pt={};T(Pt,{UsedPreloadingView:()=>Re});import"./../../../../ui/kit/kit.js";import"./../../../../ui/components/report_view/report_view.js";import*as M from"./../../../../core/common/common.js";import*as Ne from"./../../../../core/i18n/i18n.js";import{assertNotNullOrUndefined as St}from"./../../../../core/platform/platform.js";import"./../../../../core/sdk/sdk.js";import*as Fe from"./../../../../ui/legacy/legacy.js";import{html as P,nothing as ye,render as jt}from"./../../../../ui/lit/lit.js";import*as X from"./../../../../ui/visual_logging/visual_logging.js";import*as we from"./../helper/helper.js";var vt=`:host{overflow:auto;height:100%}button{font-size:inherit}devtools-report{padding:1em 0}devtools-report-section-header{padding-bottom:0;margin-bottom:-1.5em}devtools-report-section{min-width:fit-content}devtools-report-divider{margin:1em 0}.reveal-links{white-space:nowrap}.link{border:none;background:none;color:var(--sys-color-primary);text-decoration:underline;cursor:pointer;outline-offset:2px;padding:0}.status-badge-container{white-space:nowrap;margin:8px 0 24px}.status-badge-container span{margin-right:2px}.status-badge{border-radius:4px;padding:4px;devtools-icon{width:16px;height:16px}}.status-badge-success{background:var(--sys-color-surface-green)}.status-badge-failure{background:var(--sys-color-error-container)}.status-badge-neutral{background:var(--sys-color-neutral-container)}
/*# sourceURL=${import.meta.resolve("./usedPreloadingView.css")} */`;var l={speculativeLoadingStatusForThisPage:"Speculative loading status for this page",detailsFailureReason:"Failure reason",downgradedPrefetchUsed:"The initiating page attempted to prerender this page's URL. The prerender failed, but the resulting response body was still used as a prefetch.",prefetchUsed:"This page was successfully prefetched.",prerenderUsed:"This page was successfully prerendered.",prefetchFailed:"The initiating page attempted to prefetch this page's URL, but the prefetch failed, so a full navigation was performed instead.",prerenderFailed:"The initiating page attempted to prerender this page's URL, but the prerender failed, so a full navigation was performed instead.",noPreloads:"The initiating page did not attempt to speculatively load this page's URL.",currentURL:"Current URL",preloadedURLs:"URLs being speculatively loaded by the initiating page",speculationsInitiatedByThisPage:"Speculations initiated by this page",viewAllRules:"View all speculation rules",viewAllSpeculations:"View all speculations",learnMore:"Learn more: Speculative loading on developer.chrome.com",mismatchedHeadersDetail:"Mismatched HTTP request headers",badgeSuccess:"Success",badgeFailure:"Failure",badgeNoSpeculativeLoads:"No speculative loads",badgeNotTriggeredWithCount:"{n, plural, =1 {# not triggered} other {# not triggered}}",badgeInProgressWithCount:"{n, plural, =1 {# in progress} other {# in progress}}",badgeSuccessWithCount:"{n, plural, =1 {# success} other {# success}}",badgeFailureWithCount:"{n, plural, =1 {# failure} other {# failures}}",headerName:"Header name",initialNavigationValue:"Value in initial navigation",activationNavigationValue:"Value in activation navigation",missing:"(missing)"},zt=Ne.i18n.registerUIStrings("panels/application/preloading/components/UsedPreloadingView.ts",l),u=Ne.i18n.getLocalizedString.bind(void 0,zt),{widget:_t}=Fe.Widget;function Kt({kind:t,prefetch:e,prerenderLike:r,mismatchedData:a,attemptWithMismatchedHeaders:d}){let o,s;switch(t){case"DowngradedPrerenderToPrefetchAndUsed":o={type:"success"},s=P`${u(l.downgradedPrefetchUsed)}`;break;case"PrefetchUsed":o={type:"success"},s=P`${u(l.prefetchUsed)}`;break;case"PrerenderUsed":o={type:"success"},s=P`${u(l.prerenderUsed)}`;break;case"PrefetchFailed":o={type:"failure"},s=P`${u(l.prefetchFailed)}`;break;case"PrerenderFailed":o={type:"failure"},s=P`${u(l.prerenderFailed)}`;break;case"NoPreloads":o={type:"neutral",message:u(l.badgeNoSpeculativeLoads)},s=P`${u(l.noPreloads)}`;break}let m;return t==="PrefetchFailed"?(St(e),m=A(e)):(t==="PrerenderFailed"||t==="DowngradedPrerenderToPrefetchAndUsed")&&(St(r),m=H(r)),P`
    <devtools-report-section-header>
      ${u(l.speculativeLoadingStatusForThisPage)}
    </devtools-report-section-header>
    <devtools-report-section>
      <div>
        <div class="status-badge-container">
          ${bt(o)}
        </div>
        <div>
          ${s}
        </div>
      </div>
    </devtools-report-section>

    ${m!==void 0?P`
      <devtools-report-section-header>
        ${u(l.detailsFailureReason)}
      </devtools-report-section-header>
      <devtools-report-section>
        ${m}
      </devtools-report-section>`:ye}

    ${a?Gt(a):ye}
    ${d?Xt(d):ye}`}function Gt(t){return P`
    <devtools-report-section-header>
      ${u(l.currentURL)}
    </devtools-report-section-header>
    <devtools-report-section>
      <devtools-link
        class="link devtools-link"
        href=${t.pageURL}
        jslogcontext="current-url"
      >${t.pageURL}</devtools-link>
    </devtools-report-section>

    <devtools-report-section-header>
      ${u(l.preloadedURLs)}
    </devtools-report-section-header>
    <devtools-report-section jslog=${X.section("preloaded-urls")}>
      ${_t(O,{data:t})}
    </devtools-report-section>`}function Xt(t){return P`
    <devtools-report-section-header>
      ${u(l.mismatchedHeadersDetail)}
    </devtools-report-section-header>
    <devtools-report-section>
      <style>${te}</style>
      <div class="preloading-container">
        <devtools-data-grid striped inline>
          <table>
            <tr>
              <th id="header-name" weight="30" sortable>
                ${u(l.headerName)}
              </th>
              <th id="initial-value" weight="30" sortable>
                ${u(l.initialNavigationValue)}
              </th>
              <th id="activation-value" weight="30" sortable>
                ${u(l.activationNavigationValue)}
              </th>
            </tr>
            ${(t.mismatchedHeaders??[]).map(e=>P`
              <tr>
                <td>${e.headerName}</td>
                <td>${e.initialValue??u(l.missing)}</td>
                <td>${e.activationValue??u(l.missing)}</td>
              </tr>
            `)}
          </table>
        </devtools-data-grid>
      </div>
    </devtools-report-section>`}function Jt({badges:t,revealRuleSetView:e,revealAttemptViewWithFilter:r}){return P`
    <devtools-report-section-header>
      ${u(l.speculationsInitiatedByThisPage)}
    </devtools-report-section-header>
    <devtools-report-section>
      <div>
        <div class="status-badge-container">
          ${t.map(bt)}
        </div>

        <div class="reveal-links">
          <button class="link devtools-link" @click=${e}
              jslog=${X.action("view-all-rules").track({click:!0})}>
            ${u(l.viewAllRules)}
          </button>
         ・
          <button class="link devtools-link" @click=${r}
              jslog=${X.action("view-all-speculations").track({click:!0})}>
           ${u(l.viewAllSpeculations)}
          </button>
        </div>
      </div>
    </devtools-report-section>`}function bt(t){let e=(r,a,d)=>P`
      <span class=${r}>
        <devtools-icon name=${a}></devtools-icon>
        <span>
          ${d}
        </span>
      </span>
    `;switch(t.type){case"success":{let r;return t.count===void 0?r=u(l.badgeSuccess):r=u(l.badgeSuccessWithCount,{n:t.count}),e("status-badge status-badge-success","check-circle",r)}case"failure":{let r;return t.count===void 0?r=u(l.badgeFailure):r=u(l.badgeFailureWithCount,{n:t.count}),e("status-badge status-badge-failure","cross-circle",r)}case"neutral":return e("status-badge status-badge-neutral","clear",t.message)}}var Qt=(t,e,r)=>{jt(P`
    <style>${vt}</style>
    <devtools-report>
      ${Kt(t.speculativeLoadingStatusData)}

      <devtools-report-divider></devtools-report-divider>

      ${Jt(t.speculationsInitiatedSummaryData)}

      <devtools-report-divider></devtools-report-divider>

      <devtools-report-section>
        <devtools-link
          class="link devtools-link"
          href=${"https://developer.chrome.com/blog/prerender-pages/"}
          jslogcontext="learn-more"
        >${u(l.learnMore)}</devtools-link>
      </devtools-report-section>
    </devtools-report>`,r)},Re=class extends Fe.Widget.VBox{#t;constructor(e=Qt){super({useShadowDom:!0}),this.#t=e}#e={pageURL:"",previousAttempts:[],currentAttempts:[]};set data(e){this.#e=e,this.requestUpdate()}performUpdate(){let e={speculativeLoadingStatusData:this.#a(),speculationsInitiatedSummaryData:this.#o()};this.#t(e,void 0,this.contentElement)}#r(e){return["Prerender","PrerenderUntilScript"].includes(e)}#i(e){return this.#r(e.action)}#a(){let e=M.ParsedURL.ParsedURL.urlWithoutHash(this.#e.pageURL),r=this.#e.previousAttempts.filter(s=>M.ParsedURL.ParsedURL.urlWithoutHash(s.key.url)===e),a=r.filter(s=>s.key.action==="Prefetch")[0],d=r.filter(s=>this.#r(s.action))[0],o="NoPreloads";return d?.status==="Failure"&&a?.status==="Success"?o="DowngradedPrerenderToPrefetchAndUsed":a?.status==="Success"?o="PrefetchUsed":d?.status==="Success"?o="PrerenderUsed":a?.status==="Failure"?o="PrefetchFailed":d?.status==="Failure"?o="PrerenderFailed":o="NoPreloads",{kind:o,prefetch:a,prerenderLike:d,mismatchedData:this.#n(o),attemptWithMismatchedHeaders:this.#s()}}#n(e){if(e!=="NoPreloads"||this.#e.previousAttempts.length===0)return;let r=this.#e.previousAttempts.map(a=>({url:a.key.url,action:a.key.action,status:a.status}));return{pageURL:this.#e.pageURL,rows:r}}#s(){let e=this.#e.previousAttempts.find(r=>this.#i(r)&&r.mismatchedHeaders!==null);if(e?.mismatchedHeaders){if(e.key.url!==this.#e.pageURL)throw new Error("unreachable");return e}}#o(){let e=this.#e.currentAttempts.reduce((y,S)=>(y.set(S.status,(y.get(S.status)??0)+1),y),new Map),r=e.get("NotTriggered")??0,a=e.get("Ready")??0,d=e.get("Failure")??0,o=(e.get("Pending")??0)+(e.get("Running")??0),s=[];return this.#e.currentAttempts.length===0&&s.push({type:"neutral",message:u(l.badgeNoSpeculativeLoads)}),r>0&&s.push({type:"neutral",message:u(l.badgeNotTriggeredWithCount,{n:r})}),o>0&&s.push({type:"neutral",message:u(l.badgeInProgressWithCount,{n:o})}),a>0&&s.push({type:"success",count:a}),d>0&&s.push({type:"failure",count:d}),{badges:s,revealRuleSetView:()=>{M.Revealer.reveal(new we.PreloadingForward.RuleSetView(null))},revealAttemptViewWithFilter:()=>{M.Revealer.reveal(new we.PreloadingForward.AttemptViewWithFilter(null))}}}};export{Be as MismatchedPreloadingGrid,We as PreloadingDetailsReportView,Xe as PreloadingDisabledInfobar,rt as PreloadingGrid,lt as RuleSetDetailsView,mt as RuleSetGrid,Pt as UsedPreloadingView};
//# sourceMappingURL=components.js.map
