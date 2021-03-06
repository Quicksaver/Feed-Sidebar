Components.utils.import("resource://gre/modules/AddonManager.jsm");

var FEEDSIDEBAR = {
	get previewPane() { return document.getElementById("feedbar-preview"); },
	
	strings : {
		_backup : null,
		_main : null,
		
		initStrings : function () {
			if (!this._backup) { this._backup = document.getElementById("feedbar-backup-string-bundle"); }
			if (!this._main) { this._main = document.getElementById("feedbar-string-bundle"); }
		},
		
		getString : function (key) {
			this.initStrings();
			
			var rv = "";
			
			try {
				rv = this._main.getString(key);
			} catch (e) {
			}
			
			if (!rv) {
				try {
					rv = this._backup.getString(key);
				} catch (e) {
				}
			}
			
			return rv;
		},
		
		getFormattedString : function (key, args) {
			this.initStrings();
			
			var rv = "";
			
			try {
				rv = this._main.getFormattedString(key, args);
			} catch (e) {
			}
			
			if (!rv) {
				try {
					rv = this._backup.getFormattedString(key, args);
				} catch (e) {
				}
			}
			
			return rv;
		}
	},
	
	prefs : null,
	
	load : function () {
		var frame = document.getElementById("content-frame");
		
		frame.docShell.allowAuth = false;
		frame.docShell.allowImages = true;
		frame.docShell.allowJavascript = false;
		frame.docShell.allowMetaRedirects = false
		frame.docShell.allowPlugins = false;
		frame.docShell.allowSubframes = false;
		
		FEEDSIDEBAR.prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.feedbar.");	
		FEEDSIDEBAR.prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);
		FEEDSIDEBAR.prefs.addObserver("", FEEDSIDEBAR, false);
		
		document.getElementById("feed_tree").view = FEEDBAR;
		
		FEEDSIDEBAR.checkFrequencyItem(FEEDSIDEBAR.prefs.getIntPref("updateFrequency"));
		FEEDSIDEBAR.checkPeriodItem(FEEDSIDEBAR.prefs.getBoolPref("showAll") ? 0 : FEEDSIDEBAR.prefs.getIntPref("displayPeriod"));
		FEEDSIDEBAR.checkSortItem(FEEDSIDEBAR.prefs.getCharPref("lastSort"));
		
		document.getElementById("search-box").value = FEEDSIDEBAR.prefs.getCharPref("filter");
		document.getElementById("all-toggle").checked = !FEEDSIDEBAR.prefs.getBoolPref("hideReadItems");
		
		FEED_GETTER.sidebarPing();
	},
	
	unload : function () {
		FEED_GETTER.sidebarPung();
		FEEDSIDEBAR.prefs.removeObserver("", FEEDSIDEBAR);
	},
	
	observe : function(subject, topic, data) {
		if (topic != "nsPref:changed") {
			return;
		}
		
		switch(data) {
			case "hideReadItems":
				document.getElementById("all-toggle").checked = !FEEDSIDEBAR.prefs.getBoolPref("hideReadItems");
			break;
		}
	},
	
	searchTimeout : null,
	
	onSearchInput : function (value) {
		if (FEEDSIDEBAR.searchTimeout) clearTimeout(FEEDSIDEBAR.searchTimeout);
		
		FEEDSIDEBAR.searchTimeout = setTimeout(FEEDSIDEBAR.filter, 500, value);
	},
	
	filter : function (value) {
		FEEDSIDEBAR.prefs.setCharPref("filter", value);
	},
	
	setDisplayPeriod : function (days) {
		if ( days == 0 ) {
			FEEDSIDEBAR.prefs.setBoolPref("showAll", true );
		}
		
		FEEDSIDEBAR.prefs.setIntPref("displayPeriod", days);
	},
	
	setUpdateFrequency : function (minutes) {
		FEEDSIDEBAR.prefs.setIntPref("updateFrequency",minutes);
	},
	
	checkFrequencyItem : function (minutes) {
		var frequencyMenu = document.getElementById('frequency-menu');
		var frequencies = frequencyMenu.getElementsByTagName("menuitem");
		
		for (var i = 0; i < frequencies.length; i++){
			if (frequencies[i].getAttribute("value") == minutes){
				frequencies[i].setAttribute("checked","true");
			}
			else {
				frequencies[i].setAttribute("checked","false");
			}
		}
	},
	
	checkPeriodItem : function (days) {
		var periodMenu = document.getElementById('period-menu');
		var periods = periodMenu.getElementsByTagName("menuitem");
		
		for (var i = 0; i < periods.length; i++){
			if (periods[i].getAttribute("value") == days){
				periods[i].setAttribute("checked","true");
			}
			else {
				periods[i].setAttribute("checked","false");
			}
		}
	},
	
	checkSortItem : function (sort) {
		var sortMenus = [ document.getElementById('sort-menu'),document.getElementById('sort-context-menu') ];
		
		for (var i = 0; i < sortMenus.length; i++) {
			var sortMenu = sortMenus[i];
			
			var sorts = sortMenu.getElementsByTagName("menuitem");
		
			for (var j = 0; j < sorts.length; j++){
				if (sorts[j].value == sort){
					sorts[j].setAttribute("checked", "true");
				}
				else {
					sorts[j].setAttribute("checked", "false");
				}
			}
		}
	},

	options : function () {
		var browser = window.parent.gBrowser;
		
		var theTab = browser.addTab( "about:addons" );
		browser.selectedTab = theTab;
		
		// This is a hack, but content.addEventListener( "load" ) was doing nothing.
		setTimeout( function () {
			AddonManager.getAddonByID( "feedbar@efinke.com", function ( addon ) {
				content.gViewController.doCommand("cmd_showItemPreferences", addon );
			} );
		}, 1000 );
	},
	
	contextMenu : {
		customize : function (menu) {
			var options = menu.getElementsByTagName("menuitem");
			
			var itemIdx = FEEDBAR.getSelectedIndex();
			
			var hideReadItems = FEEDSIDEBAR.prefs.getBoolPref("hideReadItems");
			
			if (itemIdx >= 0) {
				if (!FEEDBAR.isContainer(itemIdx)) {
					var unreadItems = FEEDBAR.hasUnreadItems();
					var readItems = FEEDBAR.hasReadItems();
					
					// Single item menu
					for (var i = 0; i < options.length; i++){
						options[i].disabled = false;
						
						switch (options[i].getAttribute("option")) {
							case 'open':
							case 'openInWindow':
							case 'openInTab':
							case 'openAllInTabs':
							case 'options':
							case 'copyTitle':
							case 'copyLink':
							case 'sortBy':
								options[i].setAttribute("hidden", "false");
							break;
							case 'markAllAsRead':
								options[i].setAttribute("hidden", "true");
								options[i].disabled = !unreadItems;
							break;
							case 'openFeedInTabs':
							case 'markFeedAsRead':
							case 'markFeedAsUnread':
							case 'unsubscribe':
								options[i].setAttribute("hidden", "true");
							break;
							case 'markAsRead':
								options[i].setAttribute("hidden", FEEDBAR.getCellRead(itemIdx));
							break;
							case 'markAsUnread':
								options[i].setAttribute("hidden", hideReadItems || !FEEDBAR.getCellRead(itemIdx));
							break;
							case 'openUnreadInTabs':
							case 'openFeedUnreadInTabs':
								options[i].setAttribute("hidden", (!hideReadItems).toString());
							break;
							case 'markAllAsUnread':
								options[i].setAttribute("hidden", "true");
								options[i].disabled = !readItems;
							break;
						}
					}	
				}
				else {
					// Feed menu
					var unreadFeedItems = FEEDBAR.hasUnreadItems(itemIdx);
					var unreadItems = unreadFeedItems || FEEDBAR.hasUnreadItems();
					
					var readFeedItems = FEEDBAR.hasReadItems(itemIdx);
					var readItems = readFeedItems || FEEDBAR.hasReadItems();
					
					for (var i = 0; i < options.length; i++){
						options[i].disabled = false;
						
						switch (options[i].getAttribute("option")) {
							case 'open':
							case 'openInWindow':
							case 'openInTab':
							case 'markAsRead':
							case 'markAsUnread':
								options[i].setAttribute("hidden", "true");
							break;
							case 'openAllInTabs':
							case 'openFeedInTabs':
							case 'unsubscribe':
							case 'options':
							case 'copyTitle':
							case 'copyLink':
							case 'sortBy':
								options[i].setAttribute("hidden", "false");
							break;
							case 'markFeedAsRead':
								options[i].setAttribute("hidden", "false");
								options[i].disabled = !unreadFeedItems;
							break;
							case 'openUnreadInTabs':
								options[i].setAttribute("hidden", hideReadItems.toString());
								options[i].disabled = !unreadItems;
							break;
							case 'openFeedUnreadInTabs':
								options[i].setAttribute("hidden", hideReadItems.toString());
								options[i].disabled = !unreadFeedItems;
							break;
							case 'markFeedAsUnread':
								options[i].setAttribute("hidden", hideReadItems.toString());
								options[i].disabled = !readFeedItems;
							break;
							case 'markAllAsUnread':
								options[i].setAttribute("hidden", "true");
								options[i].disabled = !readItems;
							break;
							case 'markAllAsRead':
								options[i].setAttribute("hidden", "true");
								options[i].disabled = !unreadItems;
							break;
						}
					}	
				}
			}
			else {
				var unreadItems = FEEDBAR.hasUnreadItems();
				var readItems = FEEDBAR.hasReadItems();
				
				// Default menu
				for (var i = 0; i < options.length; i++){
					options[i].disabled = false;
					
					switch (options[i].getAttribute("option")) {
						case 'open':
						case 'openInWindow':
						case 'openInTab':
						case 'markAsRead':
						case 'markAsUnread':
						case 'openFeedInTabs':
						case 'markFeedAsRead':
						case 'openFeedUnreadInTabs':
						case 'markFeedAsUnread':
						case 'unsubscribe':
						case 'copyTitle':
						case 'copyLink':
							options[i].setAttribute("hidden", "true");
						break;
						case 'options':
						case 'openUnreadInTabs':
						case 'sortBy':
							options[i].setAttribute("hidden", "false");
						break;
						case 'openAllInTabs':
							options[i].setAttribute("hidden", "false");
							options[i].disabled = !(unreadItems || readItems);
						break;
						case 'markAllAsRead':
							options[i].setAttribute("hidden", "false");
							options[i].disabled = !unreadItems;
						break;
						case 'markAllAsUnread':
							options[i].setAttribute("hidden", hideReadItems.toString());
							options[i].disabled = !readItems;
						break;
					}
				}	
			}
			
			var foundOne = false;
			var lastShown = null;
			
			for (var i = 0; i < menu.childNodes.length; i++){
				if ((menu.childNodes[i].localName == "menuitem") && (menu.childNodes[i].getAttribute("hidden") == "false")){
					lastShown = menu.childNodes[i];
					foundOne = true;
				}
				else if (menu.childNodes[i].localName == "menuseparator"){
					if (foundOne) {
						menu.childNodes[i].setAttribute("hidden","false");
						lastShown = menu.childNodes[i];
						foundOne = false;
					}
					else {
						menu.childNodes[i].setAttribute("hidden","true");
					}
				}
			}
			
			if (lastShown.localName == "menuseparator") {
				lastShown.setAttribute("hidden", "true");
			}
			
			return true;
		}
	},
	
	itemSelect : function (event) {
		var idx = FEEDBAR.getSelectedIndex();
		
		if (idx < 0) {
			FEEDSIDEBAR.showPreview();
		}
		else {
			FEEDBAR.previewTimeout = FEEDBAR.setTimeout(FEEDSIDEBAR.showPreview, 450, idx);
		}
		
		event.stopPropagation();
		event.preventDefault();
	},
	
	hidePreview : function () {
		document.getElementById("feedbar-preview").collapsed = true;
		document.getElementById("preview-splitter").collapsed = true;
	},
	
	restorePreviewPane : function () {
		document.getElementById("feedbar-preview").collapsed = false;
		document.getElementById("preview-splitter").collapsed = false;
	},
	
	showPreview : function (idx) {
		var tt = FEEDSIDEBAR.previewPane;
		
		if (typeof idx == 'undefined' || (idx < 0)) {
			FEEDSIDEBAR.hidePreview();
		}
		else {
			var maxLength = 60;
			var descr = FEEDBAR.getCellDescription(idx);
			var target = document.getElementById("content-frame").contentDocument.body;
			target.innerHTML = "";
			
			var fragment = Components.classes["@mozilla.org/feed-unescapehtml;1"]  
									  .getService(Components.interfaces.nsIScriptableUnescapeHTML)  
									  .parseFragment(descr, false, null, target);
			target.appendChild(fragment);
			
			if (FEEDBAR.isContainer(idx)){
				var title = FEEDBAR.getCellLink(idx).replace(/^\s+|\s+$/g, "");
				var feedName = FEEDBAR.getCellText(idx).replace(/^\s+|\s+$/g, "");
				
				var url = FEEDBAR.getCellFeedLink(idx);
				
				document.getElementById("feedbarTooltipURL").url = url;
				if (url.length > maxLength){
					url = FEEDSIDEBAR.strings.getFormattedString( "feedbar.truncatedString", [ url.substring(0,maxLength) ] );
				}
				document.getElementById("feedbarTooltipURL").value = FEEDSIDEBAR.strings.getFormattedString( "feedbar.tooltip.labeledFeed", [ url ] );
				
				document.getElementById("feedbarTooltipName").url = title;
				
				if (title.length > maxLength){
					title = FEEDSIDEBAR.strings.getFormattedString( "feedbar.truncatedString", [ title.substring(0,maxLength) ] );
				}
				if (title == '') title = ' ';

				document.getElementById("feedbarTooltipName").value = FEEDSIDEBAR.strings.getFormattedString( "feedbar.tooltip.labeledSite", [ title ] );
			}
			else {
				var feedIdx = FEEDBAR.getParentIndex(idx);
				var feedName = FEEDBAR.getCellText(feedIdx).replace(/^\s+|\s+$/g, "");
				var url = FEEDBAR.getCellLink(idx);
				document.getElementById("feedbarTooltipURL").url = url;
				document.getElementById("feedbarTooltipName").url = url;
				if (url.length > maxLength){
					url = FEEDSIDEBAR.strings.getFormattedString( "feedbar.truncatedString", [ url.substring(0,maxLength) ] );
				}
				document.getElementById("feedbarTooltipURL").value = url;
				var title = FEEDBAR.getCellText(idx).replace(/^\s+|\s+$/g, "");
				if (title.length > maxLength){
					title = FEEDSIDEBAR.strings.getFormattedString( "feedbar.truncatedString", [ title.substring(0,maxLength) ] );
				}
				if (title == '') title = ' ';

				document.getElementById("feedbarTooltipName").value = title;
			}
			
			var image = FEEDBAR.getImageSrc(idx);
			document.getElementById("feedbarTooltipImage").src = image;
			document.getElementById("feedbarTooltipFeedName").value = feedName;
		
			document.getElementById("feedbarTooltipName").style.display = '';

			FEEDSIDEBAR.restorePreviewPane();
		}
	},
	
	addError : function (feedName, feedUrl, error, priority) {
		var livemarkId = FEED_GETTER.feedData[feedUrl.toLowerCase()].bookmarkId;
		
		var nb = document.getElementById("sidebar-notify");
		nb.appendNotification(feedName + ": " + error, feedUrl, 'chrome://browser/skin/Info.png', priority, [
			{
				accessKey : FEEDSIDEBAR.strings.getString("feedbar.errors.viewFeed.key"), 
				callback : FEEDSIDEBAR.notifyCallback, 
				label : FEEDSIDEBAR.strings.getString("feedbar.errors.viewFeed"), 
				popup : null
			},
			{
				accessKey : FEEDSIDEBAR.strings.getString("feedbar.unsubscribe.key"),
				callback : function () { FEEDBAR.unsubscribeById(livemarkId); FEED_GETTER.removeAFeed(livemarkId); },
				label : FEEDSIDEBAR.strings.getString("feedbar.unsubscribe"),
				popup : null
			}
		]);
	},

	notifyCallback : function (notification, description) {
		var browser = window.parent.gBrowser;
		
		var theTab = browser.addTab(notification.value);
		browser.selectedTab = theTab;
	},
	
	notifyNoFeeds : function () {
		var nb = document.getElementById("sidebar-notify");
		nb.appendNotification(FEEDSIDEBAR.strings.getString("feedbar.errors.noFeedsFound"), "noFeedsFound", 'chrome://browser/skin/Info.png', 5, [ { accessKey : FEEDSIDEBAR.strings.getString("feedbar.errors.noFeedsFoundKey"), callback : function () { FEEDSIDEBAR.noFeedsFoundCallback(); }, label : FEEDSIDEBAR.strings.getString("feedbar.errors.noFeedsFoundLabel"), popup : null } ]);
	},
	
	noFeedsFoundCallback : function () {
		var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
		promptService.alert(window, FEEDSIDEBAR.strings.getString("feedbar.errors.noFeedsFound"), FEEDSIDEBAR.strings.getString("feedbar.errors.noFeedsFoundMore"));
	},
	
	clearNotify : function () {
		document.getElementById("sidebar-notify").removeAllNotifications();
	}
};