var ae=Object.defineProperty;var P=(e,s)=>{for(var t in s)ae(e,t,{get:s[t],enumerable:!0})};var ce={};P(ce,{CspEvaluator:()=>k,DEFAULT_CHECKS:()=>oe,STRICTCSP_CHECKS:()=>Ae});var a=class e{type;description;severity;directive;value;constructor(s,t,i,n,c){this.type=s,this.description=t,this.severity=i,this.directive=n,this.value=c}static getHighestSeverity(s){if(s.length===0)return r.NONE;let t=s.map(n=>n.severity),i=(n,c)=>n<c?n:c;return t.reduce(i,r.NONE)}equals(s){return s instanceof e?s.type===this.type&&s.description===this.description&&s.severity===this.severity&&s.directive===this.directive&&s.value===this.value:!1}},r;(function(e){e[e.HIGH=10]="HIGH",e[e.SYNTAX=20]="SYNTAX",e[e.MEDIUM=30]="MEDIUM",e[e.HIGH_MAYBE=40]="HIGH_MAYBE",e[e.STRICT_CSP=45]="STRICT_CSP",e[e.MEDIUM_MAYBE=50]="MEDIUM_MAYBE",e[e.INFO=60]="INFO",e[e.NONE=100]="NONE"})(r||(r={}));var l;(function(e){e[e.MISSING_SEMICOLON=100]="MISSING_SEMICOLON",e[e.UNKNOWN_DIRECTIVE=101]="UNKNOWN_DIRECTIVE",e[e.INVALID_KEYWORD=102]="INVALID_KEYWORD",e[e.NONCE_CHARSET=106]="NONCE_CHARSET",e[e.MISSING_DIRECTIVES=300]="MISSING_DIRECTIVES",e[e.SCRIPT_UNSAFE_INLINE=301]="SCRIPT_UNSAFE_INLINE",e[e.SCRIPT_UNSAFE_EVAL=302]="SCRIPT_UNSAFE_EVAL",e[e.PLAIN_URL_SCHEMES=303]="PLAIN_URL_SCHEMES",e[e.PLAIN_WILDCARD=304]="PLAIN_WILDCARD",e[e.SCRIPT_ALLOWLIST_BYPASS=305]="SCRIPT_ALLOWLIST_BYPASS",e[e.OBJECT_ALLOWLIST_BYPASS=306]="OBJECT_ALLOWLIST_BYPASS",e[e.NONCE_LENGTH=307]="NONCE_LENGTH",e[e.IP_SOURCE=308]="IP_SOURCE",e[e.DEPRECATED_DIRECTIVE=309]="DEPRECATED_DIRECTIVE",e[e.SRC_HTTP=310]="SRC_HTTP",e[e.STRICT_DYNAMIC=400]="STRICT_DYNAMIC",e[e.STRICT_DYNAMIC_NOT_STANDALONE=401]="STRICT_DYNAMIC_NOT_STANDALONE",e[e.NONCE_HASH=402]="NONCE_HASH",e[e.UNSAFE_INLINE_FALLBACK=403]="UNSAFE_INLINE_FALLBACK",e[e.ALLOWLIST_FALLBACK=404]="ALLOWLIST_FALLBACK",e[e.IGNORED=405]="IGNORED",e[e.REQUIRE_TRUSTED_TYPES_FOR_SCRIPTS=500]="REQUIRE_TRUSTED_TYPES_FOR_SCRIPTS",e[e.REPORTING_DESTINATION_MISSING=600]="REPORTING_DESTINATION_MISSING",e[e.REPORT_TO_ONLY=601]="REPORT_TO_ONLY"})(l||(l={}));var E=class e{directives={};clone(){let s=new e;for(let[t,i]of Object.entries(this.directives))i&&(s.directives[t]=[...i]);return s}convertToString(){let s="";for(let[t,i]of Object.entries(this.directives)){if(s+=t,i!==void 0)for(let n,c=0;n=i[c];c++)s+=" ",s+=n;s+="; "}return s}getEffectiveCsp(s,t){let i=t||[],n=this.clone(),c=n.getEffectiveDirective(o.SCRIPT_SRC),p=this.directives[c]||[],u=n.directives[c];if(u&&(n.policyHasScriptNonces()||n.policyHasScriptHashes()))if(s>=f.CSP2)p.includes(m.UNSAFE_INLINE)&&(v(u,m.UNSAFE_INLINE),i.push(new a(l.IGNORED,"unsafe-inline is ignored if a nonce or a hash is present. (CSP2 and above)",r.NONE,c,m.UNSAFE_INLINE)));else for(let d of p)(d.startsWith("'nonce-")||d.startsWith("'sha"))&&v(u,d);if(u&&this.policyHasStrictDynamic())if(s>=f.CSP3)for(let d of p)(!d.startsWith("'")||d===m.SELF||d===m.UNSAFE_INLINE)&&(v(u,d),i.push(new a(l.IGNORED,"Because of strict-dynamic this entry is ignored in CSP3 and above",r.NONE,c,d)));else v(u,m.STRICT_DYNAMIC);return s<f.CSP3&&(delete n.directives[o.REPORT_TO],delete n.directives[o.WORKER_SRC],delete n.directives[o.MANIFEST_SRC],delete n.directives[o.TRUSTED_TYPES],delete n.directives[o.REQUIRE_TRUSTED_TYPES_FOR]),n}getEffectiveDirective(s){return!(s in this.directives)&&le.includes(s)?o.DEFAULT_SRC:s}getEffectiveDirectives(s){return[...new Set(s.map(i=>this.getEffectiveDirective(i)))]}policyHasScriptNonces(){let s=this.getEffectiveDirective(o.SCRIPT_SRC);return(this.directives[s]||[]).some(i=>R(i))}policyHasScriptHashes(){let s=this.getEffectiveDirective(o.SCRIPT_SRC);return(this.directives[s]||[]).some(i=>A(i))}policyHasStrictDynamic(){let s=this.getEffectiveDirective(o.SCRIPT_SRC);return(this.directives[s]||[]).includes(m.STRICT_DYNAMIC)}},m;(function(e){e.SELF="'self'",e.NONE="'none'",e.UNSAFE_INLINE="'unsafe-inline'",e.UNSAFE_EVAL="'unsafe-eval'",e.WASM_EVAL="'wasm-eval'",e.WASM_UNSAFE_EVAL="'wasm-unsafe-eval'",e.STRICT_DYNAMIC="'strict-dynamic'",e.UNSAFE_HASHED_ATTRIBUTES="'unsafe-hashed-attributes'",e.UNSAFE_HASHES="'unsafe-hashes'",e.REPORT_SAMPLE="'report-sample'",e.BLOCK="'block'",e.ALLOW="'allow'"})(m||(m={}));var h;(function(e){e.SCRIPT="'script'"})(h||(h={}));var o;(function(e){e.CHILD_SRC="child-src",e.CONNECT_SRC="connect-src",e.DEFAULT_SRC="default-src",e.FONT_SRC="font-src",e.FRAME_SRC="frame-src",e.IMG_SRC="img-src",e.MEDIA_SRC="media-src",e.OBJECT_SRC="object-src",e.SCRIPT_SRC="script-src",e.SCRIPT_SRC_ATTR="script-src-attr",e.SCRIPT_SRC_ELEM="script-src-elem",e.STYLE_SRC="style-src",e.STYLE_SRC_ATTR="style-src-attr",e.STYLE_SRC_ELEM="style-src-elem",e.PREFETCH_SRC="prefetch-src",e.MANIFEST_SRC="manifest-src",e.WORKER_SRC="worker-src",e.BASE_URI="base-uri",e.PLUGIN_TYPES="plugin-types",e.SANDBOX="sandbox",e.DISOWN_OPENER="disown-opener",e.FORM_ACTION="form-action",e.FRAME_ANCESTORS="frame-ancestors",e.NAVIGATE_TO="navigate-to",e.REPORT_TO="report-to",e.REPORT_URI="report-uri",e.BLOCK_ALL_MIXED_CONTENT="block-all-mixed-content",e.UPGRADE_INSECURE_REQUESTS="upgrade-insecure-requests",e.REFLECTED_XSS="reflected-xss",e.REFERRER="referrer",e.REQUIRE_SRI_FOR="require-sri-for",e.TRUSTED_TYPES="trusted-types",e.REQUIRE_TRUSTED_TYPES_FOR="require-trusted-types-for",e.WEBRTC="webrtc"})(o||(o={}));var le=[o.CHILD_SRC,o.CONNECT_SRC,o.DEFAULT_SRC,o.FONT_SRC,o.FRAME_SRC,o.IMG_SRC,o.MANIFEST_SRC,o.MEDIA_SRC,o.OBJECT_SRC,o.SCRIPT_SRC,o.SCRIPT_SRC_ATTR,o.SCRIPT_SRC_ELEM,o.STYLE_SRC,o.STYLE_SRC_ATTR,o.STYLE_SRC_ELEM,o.WORKER_SRC],f;(function(e){e[e.CSP1=1]="CSP1",e[e.CSP2=2]="CSP2",e[e.CSP3=3]="CSP3"})(f||(f={}));function _(e){return Object.values(o).includes(e)}function C(e){return Object.values(m).includes(e)}function T(e){return new RegExp("^[a-zA-Z][+a-zA-Z0-9.-]*:$").test(e)}var ue=new RegExp("^'nonce-[a-zA-Z0-9+/_-]+[=]{0,2}'$"),me=new RegExp("^'nonce-(.+)'$");function R(e,s){return(s?ue:me).test(e)}var pe=new RegExp("^'(sha256|sha384|sha512)-[a-zA-Z0-9+/]+[=]{0,2}'$"),de=new RegExp("^'(sha256|sha384|sha512)-(.+)'$");function A(e,s){return(s?pe:de).test(e)}function v(e,s){if(e.includes(s)){let t=e.findIndex(i=>s===i);e.splice(t,1)}}function L(e){let s=[];for(let t of Object.keys(e.directives))_(t)||(t.endsWith(":")?s.push(new a(l.UNKNOWN_DIRECTIVE,"CSP directives don't end with a colon.",r.SYNTAX,t)):s.push(new a(l.UNKNOWN_DIRECTIVE,'Directive "'+t+'" is not a known CSP directive.',r.SYNTAX,t)));return s}function D(e){let s=[];for(let[t,i]of Object.entries(e.directives))if(i!==void 0)for(let n of i)_(n)&&s.push(new a(l.MISSING_SEMICOLON,'Did you forget the semicolon? "'+n+'" seems to be a directive, not a value.',r.SYNTAX,t,n));return s}function U(e){let s=[],t=Object.values(m).map(i=>i.replace(/'/g,""));for(let[i,n]of Object.entries(e.directives))if(n!==void 0)for(let c of n){if(t.some(p=>p===c)||c.startsWith("nonce-")||c.match(/^(sha256|sha384|sha512)-/)){s.push(new a(l.INVALID_KEYWORD,'Did you forget to surround "'+c+'" with single-ticks?',r.SYNTAX,i,c));continue}if(c.startsWith("'")){if(i===o.REQUIRE_TRUSTED_TYPES_FOR){if(c===h.SCRIPT)continue}else if(i===o.TRUSTED_TYPES){if(c==="'allow-duplicates'"||c==="'none'")continue}else if(C(c)||A(c)||R(c))continue;s.push(new a(l.INVALID_KEYWORD,c+" seems to be an invalid CSP keyword.",r.SYNTAX,i,c))}}return s}var j=["//gstatic.com/fsn/angular_js-bundle1.js","//www.gstatic.com/fsn/angular_js-bundle1.js","//www.googleadservices.com/pageadimg/imgad","//yandex.st/angularjs/1.2.16/angular-cookies.min.js","//yastatic.net/angularjs/1.2.23/angular.min.js","//yuedust.yuedu.126.net/js/components/angular/angular.js","//art.jobs.netease.com/script/angular.js","//csu-c45.kxcdn.com/angular/angular.js","//elysiumwebsite.s3.amazonaws.com/uploads/blog-media/rockstar/angular.min.js","//inno.blob.core.windows.net/new/libs/AngularJS/1.2.1/angular.min.js","//gift-talk.kakao.com/public/javascripts/angular.min.js","//ajax.googleapis.com/ajax/libs/angularjs/1.2.0rc1/angular-route.min.js","//master-sumok.ru/vendors/angular/angular-cookies.js","//ayicommon-a.akamaihd.net/static/vendor/angular-1.4.2.min.js","//pangxiehaitao.com/framework/angular-1.3.9/angular-animate.min.js","//cdnjs.cloudflare.com/ajax/libs/angular.js/1.2.16/angular.min.js","//96fe3ee995e96e922b6b-d10c35bd0a0de2c718b252bc575fdb73.ssl.cf1.rackcdn.com/angular.js","//oss.maxcdn.com/angularjs/1.2.20/angular.min.js","//reports.zemanta.com/smedia/common/angularjs/1.2.11/angular.js","//cdn.shopify.com/s/files/1/0225/6463/t/1/assets/angular-animate.min.js","//parademanagement.com.s3-website-ap-southeast-1.amazonaws.com/js/angular.min.js","//cdn.jsdelivr.net/angularjs/1.1.2/angular.min.js","//eb2883ede55c53e09fd5-9c145fb03d93709ea57875d307e2d82e.ssl.cf3.rackcdn.com/components/angular-resource.min.js","//andors-trail.googlecode.com/git/AndorsTrailEdit/lib/angular.min.js","//cdn.walkme.com/General/EnvironmentTests/angular/angular.min.js","//laundrymail.com/angular/angular.js","//s3-eu-west-1.amazonaws.com/staticancpa/js/angular-cookies.min.js","//collade.demo.stswp.com/js/vendor/angular.min.js","//mrfishie.github.io/sailor/bower_components/angular/angular.min.js","//askgithub.com/static/js/angular.min.js","//services.amazon.com/solution-providers/assets/vendor/angular-cookies.min.js","//raw.githubusercontent.com/angular/code.angularjs.org/master/1.0.7/angular-resource.js","//prb-resume.appspot.com/bower_components/angular-animate/angular-animate.js","//dl.dropboxusercontent.com/u/30877786/angular.min.js","//static.tumblr.com/x5qdx0r/nPOnngtff/angular-resource.min_1_.js","//storage.googleapis.com/assets-prod.urbansitter.net/us-sym/assets/vendor/angular-sanitize/angular-sanitize.min.js","//twitter.github.io/labella.js/bower_components/angular/angular.min.js","//cdn2-casinoroom.global.ssl.fastly.net/js/lib/angular-animate.min.js","//www.adobe.com/devnet-apps/flashshowcase/lib/angular/angular.1.1.5.min.js","//eternal-sunset.herokuapp.com/bower_components/angular/angular.js","//cdn.bootcss.com/angular.js/1.2.0/angular.min.js"];var x=["//vk.com/swf/video.swf","//ajax.googleapis.com/ajax/libs/yui/2.8.0r4/build/charts/assets/charts.swf"];var y=["googletagmanager.com","www.googletagmanager.com","www.googleadservices.com","google-analytics.com","ssl.google-analytics.com","www.google-analytics.com"],F=["//bebezoo.1688.com/fragment/index.htm","//www.google-analytics.com/gtm/js","//googleads.g.doubleclick.net/pagead/conversion/1036918760/wcm","//www.googleadservices.com/pagead/conversion/1070110417/wcm","//www.google.com/tools/feedback/escalation-options","//pin.aliyun.com/check_audio","//offer.alibaba.com/market/CID100002954/5/fetchKeyword.do","//ccrprod.alipay.com/ccr/arriveTime.json","//group.aliexpress.com/ajaxAcquireGroupbuyProduct.do","//detector.alicdn.com/2.7.3/index.php","//suggest.taobao.com/sug","//translate.google.com/translate_a/l","//count.tbcdn.cn//counter3","//wb.amap.com/channel.php","//translate.googleapis.com/translate_a/l","//afpeng.alimama.com/ex","//accounts.google.com/o/oauth2/revoke","//pagead2.googlesyndication.com/relatedsearch","//yandex.ru/soft/browsers/check","//api.facebook.com/restserver.php","//mts0.googleapis.com/maps/vt","//syndication.twitter.com/widgets/timelines/765840589183213568","//www.youtube.com/profile_style","//googletagmanager.com/gtm/js","//mc.yandex.ru/watch/24306916/1","//share.yandex.net/counter/gpp/","//ok.go.mail.ru/lady_on_lady_recipes_r.json","//d1f69o4buvlrj5.cloudfront.net/__efa_15_1_ornpba.xekq.arg/optout_check","//www.googletagmanager.com/gtm/js","//api.vk.com/method/wall.get","//www.sharethis.com/get-publisher-info.php","//google.ru/maps/vt","//pro.netrox.sc/oapi/h_checksite.ashx","//vimeo.com/api/oembed.json/","//de.blog.newrelic.com/wp-admin/admin-ajax.php","//ajax.googleapis.com/ajax/services/search/news","//ssl.google-analytics.com/gtm/js","//pubsub.pubnub.com/subscribe/demo/hello_world/","//pass.yandex.ua/services","//id.rambler.ru/script/topline_info.js","//m.addthis.com/live/red_lojson/100eng.json","//passport.ngs.ru/ajax/check","//catalog.api.2gis.ru/ads/search","//gum.criteo.com/sync","//maps.google.com/maps/vt","//ynuf.alipay.com/service/um.json","//securepubads.g.doubleclick.net/gampad/ads","//c.tiles.mapbox.com/v3/texastribune.tx-congress-cvap/6/15/26.grid.json","//rexchange.begun.ru/banners","//an.yandex.ru/page/147484","//links.services.disqus.com/api/ping","//api.map.baidu.com/","//tj.gongchang.com/api/keywordrecomm/","//data.gongchang.com/livegrail/","//ulogin.ru/token.php","//beta.gismeteo.ru/api/informer/layout.js/120x240-3/ru/","//maps.googleapis.com/maps/api/js/GeoPhotoService.GetMetadata","//a.config.skype.com/config/v1/Skype/908_1.33.0.111/SkypePersonalization","//maps.beeline.ru/w","//target.ukr.net/","//www.meteoprog.ua/data/weather/informer/Poltava.js","//cdn.syndication.twimg.com/widgets/timelines/599200054310604802","//wslocker.ru/client/user.chk.php","//community.adobe.com/CommunityPod/getJSON","//maps.google.lv/maps/vt","//dev.virtualearth.net/REST/V1/Imagery/Metadata/AerialWithLabels/26.318581","//awaps.yandex.ru/10/8938/02400400.","//a248.e.akamai.net/h5.hulu.com/h5.mp4","//nominatim.openstreetmap.org/","//plugins.mozilla.org/en-us/plugins_list.json","//h.cackle.me/widget/32153/bootstrap","//graph.facebook.com/1/","//fellowes.ugc.bazaarvoice.com/data/reviews.json","//widgets.pinterest.com/v3/pidgets/boards/ciciwin/hedgehog-squirrel-crafts/pins/","//www.linkedin.com/countserv/count/share","//se.wikipedia.org/w/api.php","//cse.google.com/api/007627024705277327428/cse/r3vs7b0fcli/queries/js","//relap.io/api/v2/similar_pages_jsonp.js","//c1n3.hypercomments.com/stream/subscribe","//maps.google.de/maps/vt","//books.google.com/books","//connect.mail.ru/share_count","//tr.indeed.com/m/newjobs","//www-onepick-opensocial.googleusercontent.com/gadgets/proxy","//www.panoramio.com/map/get_panoramas.php","//client.siteheart.com/streamcli/client","//www.facebook.com/restserver.php","//autocomplete.travelpayouts.com/avia","//www.googleapis.com/freebase/v1/topic/m/0344_","//mts1.googleapis.com/mapslt/ft","//api.twitter.com/1/statuses/oembed.json","//fast.wistia.com/embed/medias/o75jtw7654.json","//partner.googleadservices.com/gampad/ads","//pass.yandex.ru/services","//gupiao.baidu.com/stocks/stockbets","//widget.admitad.com/widget/init","//api.instagram.com/v1/tags/partykungen23328/media/recent","//video.media.yql.yahoo.com/v1/video/sapi/streams/063fb76c-6c70-38c5-9bbc-04b7c384de2b","//ib.adnxs.com/jpt","//pass.yandex.com/services","//www.google.de/maps/vt","//clients1.google.com/complete/search","//api.userlike.com/api/chat/slot/proactive/","//www.youku.com/index_cookielist/s/jsonp","//mt1.googleapis.com/mapslt/ft","//api.mixpanel.com/track/","//wpd.b.qq.com/cgi/get_sign.php","//pipes.yahooapis.com/pipes/pipe.run","//gdata.youtube.com/feeds/api/videos/WsJIHN1kNWc","//9.chart.apis.google.com/chart","//cdn.syndication.twitter.com/moments/709229296800440320","//api.flickr.com/services/feeds/photos_friends.gne","//cbks0.googleapis.com/cbk","//www.blogger.com/feeds/5578653387562324002/posts/summary/4427562025302749269","//query.yahooapis.com/v1/public/yql","//kecngantang.blogspot.com/feeds/posts/default/-/Komik","//www.travelpayouts.com/widgets/50f53ce9ada1b54bcc000031.json","//i.cackle.me/widget/32586/bootstrap","//translate.yandex.net/api/v1.5/tr.json/detect","//a.tiles.mapbox.com/v3/zentralmedia.map-n2raeauc.jsonp","//maps.google.ru/maps/vt","//c1n2.hypercomments.com/stream/subscribe","//rec.ydf.yandex.ru/cookie","//cdn.jsdelivr.net"];function g(e){return e=e.replace(/^\w[+\w.-]*:\/\//i,""),e=e.replace(/^\/\//,""),e}function H(e){let s=new URL("https://"+g(e).replace(":*","").replace("*","wildcard_placeholder")).hostname.replace("wildcard_placeholder","*"),t=/^\[[\d:]+\]/;return g(e).match(t)&&!s.match(t)?"["+s+"]":s}function M(e){return e.startsWith("//")?e.replace("//","https://"):e}function N(e,s){let t=new URL(M(e.replace(":*","").replace("*","wildcard_placeholder"))),i=s.map(S=>new URL(M(S))),n=t.hostname.toLowerCase(),c=n.startsWith("wildcard_placeholder."),p=n.replace(/^\wildcard_placeholder/i,""),u=t.pathname,d=u!=="/";for(let S of i){let O=S.hostname;if(O.endsWith(p)&&!(!c&&n!==O)){if(d){if(u.endsWith("/")){if(!S.pathname.startsWith(u))continue}else if(S.pathname!==u)continue}return S}}return null}function w(e,s){let t=Object.keys(e.directives);for(let i of t){let n=e.directives[i];n&&s(i,n)}}var Y=[o.SCRIPT_SRC,o.OBJECT_SRC,o.BASE_URI],_e=["data:","http:","https:"];function W(e){let s=e.getEffectiveDirective(o.SCRIPT_SRC);return(e.directives[s]||[]).includes(m.UNSAFE_INLINE)?[new a(l.SCRIPT_UNSAFE_INLINE,"'unsafe-inline' allows the execution of unsafe in-page scripts and event handlers.",r.HIGH,s,m.UNSAFE_INLINE)]:[]}function B(e){let s=e.getEffectiveDirective(o.SCRIPT_SRC);return(e.directives[s]||[]).includes(m.UNSAFE_EVAL)?[new a(l.SCRIPT_UNSAFE_EVAL,"'unsafe-eval' allows the execution of code injected into DOM APIs such as eval().",r.MEDIUM_MAYBE,s,m.UNSAFE_EVAL)]:[]}function G(e){let s=[],t=e.getEffectiveDirectives(Y);for(let i of t){let n=e.directives[i]||[];for(let c of n)_e.includes(c)&&s.push(new a(l.PLAIN_URL_SCHEMES,c+" URI in "+i+" allows the execution of unsafe scripts.",r.HIGH,i,c))}return s}function V(e){let s=[],t=e.getEffectiveDirectives(Y);for(let i of t){let n=e.directives[i]||[];for(let c of n)if(g(c)==="*"){s.push(new a(l.PLAIN_WILDCARD,i+" should not allow '*' as source",r.HIGH,i,c));continue}}return s}function Re(e){let s=[];return o.OBJECT_SRC in e.directives?s=e.directives[o.OBJECT_SRC]:o.DEFAULT_SRC in e.directives&&(s=e.directives[o.DEFAULT_SRC]),s!==void 0&&s.length>=1?[]:[new a(l.MISSING_DIRECTIVES,"Missing object-src allows the injection of plugins which can execute JavaScript. Can you set it to 'none'?",r.HIGH,o.OBJECT_SRC)]}function Ie(e){return o.SCRIPT_SRC in e.directives||o.DEFAULT_SRC in e.directives?[]:[new a(l.MISSING_DIRECTIVES,"script-src directive is missing.",r.HIGH,o.SCRIPT_SRC)]}function ve(e){return Ce([e])}function Ce(e){let s=i=>i.policyHasScriptNonces()||i.policyHasScriptHashes()&&i.policyHasStrictDynamic(),t=i=>o.BASE_URI in i.directives;if(e.some(s)&&!e.some(t)){let i="Missing base-uri allows the injection of base tags. They can be used to set the base URL for all relative (script) URLs to an attacker controlled domain. Can you set it to 'none' or 'self'?";return[new a(l.MISSING_DIRECTIVES,i,r.HIGH,o.BASE_URI)]}return[]}function q(e){return[...Re(e),...Ie(e),...ve(e)]}function K(e){let s=[],t=e.getEffectiveDirective(o.SCRIPT_SRC),i=e.directives[t]||[];if(i.includes(m.NONE))return s;for(let n of i){if(n===m.SELF){s.push(new a(l.SCRIPT_ALLOWLIST_BYPASS,"'self' can be problematic if you host JSONP, AngularJS or user uploaded files.",r.MEDIUM_MAYBE,t,n));continue}if(n.startsWith("'")||T(n)||n.indexOf(".")===-1)continue;let c="//"+g(n),p=N(c,j),u=N(c,F);if(u){let d=y.includes(u.hostname),S=i.includes(m.UNSAFE_EVAL);d&&!S&&(u=null)}if(u||p){let d="",S="";u&&(d=u.hostname,S=" JSONP endpoints"),p&&(d=p.hostname,S+=S.trim()===""?"":" and",S+=" Angular libraries"),s.push(new a(l.SCRIPT_ALLOWLIST_BYPASS,d+" is known to host"+S+" which allow to bypass this CSP.",r.HIGH,t,n))}else s.push(new a(l.SCRIPT_ALLOWLIST_BYPASS,"No bypass found; make sure that this URL doesn't serve JSONP replies or Angular libraries.",r.MEDIUM_MAYBE,t,n))}return s}function J(e){let s=[],t=e.getEffectiveDirective(o.OBJECT_SRC),i=e.directives[t]||[],n=e.directives[o.PLUGIN_TYPES];if(n&&!n.includes("application/x-shockwave-flash"))return[];for(let c of i){if(c===m.NONE)return[];let p="//"+g(c),u=N(p,x);u?s.push(new a(l.OBJECT_ALLOWLIST_BYPASS,u.hostname+" is known to host Flash files which allow to bypass this CSP.",r.HIGH,t,c)):t===o.OBJECT_SRC&&s.push(new a(l.OBJECT_ALLOWLIST_BYPASS,"Can you restrict object-src to 'none' only?",r.MEDIUM_MAYBE,t,c))}return s}function Te(e){return!!(e.startsWith("[")&&e.endsWith("]")||/^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/.test(e))}function z(e){let s=[];return w(e,(i,n)=>{for(let c of n){let p=H(c);Te(p)&&(p==="127.0.0.1"?s.push(new a(l.IP_SOURCE,i+" directive allows localhost as source. Please make sure to remove this in production environments.",r.INFO,i,c)):s.push(new a(l.IP_SOURCE,i+" directive has an IP-Address as source: "+p+" (will be ignored by browsers!). ",r.INFO,i,c)))}}),s}function X(e){let s=[];return o.REFLECTED_XSS in e.directives&&s.push(new a(l.DEPRECATED_DIRECTIVE,"reflected-xss is deprecated since CSP2. Please, use the X-XSS-Protection header instead.",r.INFO,o.REFLECTED_XSS)),o.REFERRER in e.directives&&s.push(new a(l.DEPRECATED_DIRECTIVE,"referrer is deprecated since CSP2. Please, use the Referrer-Policy header instead.",r.INFO,o.REFERRER)),o.DISOWN_OPENER in e.directives&&s.push(new a(l.DEPRECATED_DIRECTIVE,"disown-opener is deprecated since CSP3. Please, use the Cross Origin Opener Policy header instead.",r.INFO,o.DISOWN_OPENER)),s}function Q(e){let s=new RegExp("^'nonce-(.+)'$"),t=[];return w(e,(i,n)=>{for(let c of n){let p=c.match(s);if(!p)continue;p[1].length<8&&t.push(new a(l.NONCE_LENGTH,"Nonces should be at least 8 characters long.",r.MEDIUM,i,c)),R(c,!0)||t.push(new a(l.NONCE_CHARSET,"Nonces should only use the base64 charset.",r.INFO,i,c))}}),t}function $(e){let s=[];return w(e,(t,i)=>{for(let n of i){let c=t===o.REPORT_URI?"Use HTTPS to send violation reports securely.":"Allow only resources downloaded over HTTPS.";n.startsWith("http://")&&s.push(new a(l.SRC_HTTP,c,r.MEDIUM,t,n))}}),s}function Z(e){let s=e.getEffectiveDirective(o.SCRIPT_SRC),t=e.directives[s]||[];return t.some(n=>!n.startsWith("'"))&&!t.includes(m.STRICT_DYNAMIC)?[new a(l.STRICT_DYNAMIC,"Host allowlists can frequently be bypassed. Consider using 'strict-dynamic' in combination with CSP nonces or hashes.",r.STRICT_CSP,s)]:[]}function ee(e){let s=e.getEffectiveDirective(o.SCRIPT_SRC);return(e.directives[s]||[]).includes(m.STRICT_DYNAMIC)&&!e.policyHasScriptNonces()&&!e.policyHasScriptHashes()?[new a(l.STRICT_DYNAMIC_NOT_STANDALONE,"'strict-dynamic' without a CSP nonce/hash will block all scripts.",r.INFO,s)]:[]}function se(e){if(!e.policyHasScriptNonces()&&!e.policyHasScriptHashes())return[];let s=e.getEffectiveDirective(o.SCRIPT_SRC);return(e.directives[s]||[]).includes(m.UNSAFE_INLINE)?[]:[new a(l.UNSAFE_INLINE_FALLBACK,"Consider adding 'unsafe-inline' (ignored by browsers supporting nonces/hashes) to be backward compatible with older browsers.",r.STRICT_CSP,s)]}function te(e){let s=e.getEffectiveDirective(o.SCRIPT_SRC),t=e.directives[s]||[];return t.includes(m.STRICT_DYNAMIC)?t.some(i=>["http:","https:","*"].includes(i)||i.includes("."))?[]:[new a(l.ALLOWLIST_FALLBACK,"Consider adding https: and http: url schemes (ignored by browsers supporting 'strict-dynamic') to be backward compatible with older browsers.",r.STRICT_CSP,s)]:[]}function ie(e){let s=e.getEffectiveDirective(o.REQUIRE_TRUSTED_TYPES_FOR);return(e.directives[s]||[]).includes(h.SCRIPT)?[]:[new a(l.REQUIRE_TRUSTED_TYPES_FOR_SCRIPTS,`Consider requiring Trusted Types for scripts to lock down DOM XSS injection sinks. You can do this by adding "require-trusted-types-for 'script'" to your policy.`,r.INFO,o.REQUIRE_TRUSTED_TYPES_FOR)]}var k=class{version;csp;findings=[];constructor(s,t){this.version=t||f.CSP3,this.csp=s}evaluate(s,t){this.findings=[];let i=t||oe,n=this.csp.getEffectiveCsp(this.version,this.findings);if(s)for(let c of s)this.findings=this.findings.concat(c(this.csp));for(let c of i)this.findings=this.findings.concat(c(n));return this.findings}},oe=[W,B,G,V,q,K,J,z,Q,$,X,L,D,U],Ae=[Z,ee,se,te,ie];var re={};P(re,{CspParser:()=>b,TEST_ONLY:()=>ke});var b=class{csp;constructor(s){this.csp=new E,this.parse(s)}parse(s){this.csp=new E;let t=s.split(";");for(let i=0;i<t.length;i++){let c=t[i].trim().match(/\S+/g);if(Array.isArray(c)){let p=c[0].toLowerCase();if(p in this.csp.directives)continue;_(p);let u=[];for(let d,S=1;d=c[S];S++)d=ne(d),u.includes(d)||u.push(d);this.csp.directives[p]=u}}return this.csp}};function ne(e){e=e.trim();let s=e.toLowerCase();return C(s)||T(e)?s:e}var ke={normalizeDirectiveValue:ne};export{ce as CspEvaluator,re as CspParser};
/**
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @author lwe@google.com (Lukas Weichselbaum)
 */
/**
 * @fileoverview CSP definitions and helper functions.
 * @author lwe@google.com (Lukas Weichselbaum)
 *
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @fileoverview Collection of CSP parser checks which can be used to find
 * common syntax mistakes like missing semicolons, invalid directives or
 * invalid keywords.
 * @author lwe@google.com (Lukas Weichselbaum)
 *
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @fileoverview Collection of popular sites/CDNs hosting Angular.
 * @author lwe@google.com (Lukas Weichselbaum)
 *
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @fileoverview Collection of popular sites/CDNs hosting flash with user
 * provided JS.
 * @author lwe@google.com (Lukas Weichselbaum)
 *
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @fileoverview Collection of popular sites/CDNs hosting JSONP-like endpoints.
 * Endpoints don't contain necessary parameters to trigger JSONP response
 * because parameters are ignored in CSP allowlists.
 * Usually per domain only one (popular) file path is listed to allow bypasses
 * of the most common path based allowlists. It's not practical to ship a list
 * for all possible paths/domains. Therefore the jsonp bypass check usually only
 * works efficient for domain based allowlists.
 * @author lwe@google.com (Lukas Weichselbaum)
 *
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @fileoverview Utils for CSP evaluator.
 * @author lwe@google.com (Lukas Weichselbaum)
 *
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @fileoverview Collection of CSP evaluation checks.
 * @author lwe@google.com (Lukas Weichselbaum)
 *
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @fileoverview Collection of "strict" CSP and backward compatibility checks.
 * A "strict" CSP is based on nonces or hashes and drops the allowlist.
 * These checks ensure that 'strict-dynamic' and a CSP nonce/hash are present.
 * Due to 'strict-dynamic' any allowlist will get dropped in CSP3.
 * The backward compatibility checks ensure that the strict nonce/hash based CSP
 * will be a no-op in older browsers by checking for presence of 'unsafe-inline'
 * (will be dropped in newer browsers if a nonce or hash is present) and for
 * prsensence of http: and https: url schemes (will be droped in the presence of
 * 'strict-dynamic' in newer browsers).
 *
 * @author lwe@google.com (Lukas Weichselbaum)
 *
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @author lwe@google.com (Lukas Weichselbaum)
 *
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
//# sourceMappingURL=csp_evaluator.js.map
