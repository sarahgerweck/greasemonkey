// ==UserScript==
// @name        LovecraftEmDashes
// @namespace   http://gerweck.org/
// @include     http://www.dagonbytes.com/thelibrary/lovecraft/*.htm*
// @version     1
// @grant       none
// @require     https://raw.githubusercontent.com/leecrossley/functional-js/master/functional.min.js
// ==/UserScript==
// ==ClosureCompiler==
// @output_file_name default.js
// @compilation_level ADVANCED_OPTIMIZATIONS
// @code_url https://raw.githubusercontent.com/leecrossley/functional-js/master/functional.min.js
// @js_externs var fjs; fjs.isString = function(a){};
// ==/ClosureCompiler==

var RegexUtil = (function() {
	var exports = {};

	/** Basic replacement function */
	var replacer = function(x, y) {
		return x.replace(y[0], y[1]);
	};

	/** Apply many regexes in sequence */
	exports.multiRegex = fjs.curry(function(re, s) {
		return fjs.fold(replacer, s, re);
	});

	return exports;
})();

var Beautifier = (function() {
	var exports = {};

	/* Import a helper function from regex utils. */
	var applyRegexes = RegexUtil.multiRegex;

	/** Helpers for generating small caps */
	var smallCapStyle = 'font-varant: small-caps; font-variant-caps: all-small-caps;';
	exports.smallCapSpan = function(body) {
		return '<span style="' + smallCapStyle + '">' + body + '</span>';
	};

	/** Standard typographic formatting */
	var regexes = [
		[/(\d)-(\d)/g,           '$1–$2'],
		[/\s+-\s+|--| -- /g,     '—'],
		[/\.\.\./g,              '…'],
		[/(°\d+)'/g,             '$1′'],
		[/(′\d+)"/g,             '$1″'],
		[/^'s(\s)/g,             '’s$1'],
		[/'(em|twas|\d+)\b/g,    '’$1'],
		[/([^\s'])'([^']|$)/g,   '$1’$2'],
		[/(^|\s)'(\S)/g,         '$1‘$2'],
		[/(^|\s|—)"([^\s"])/g,   '$1“$2'],
		[/([^\s"])"([,.\s]|$)/g, '$1”$2'],
		[/ "$/g,                 ' “'],
		[/^" /g,                 ' ”']
	];
	exports.apply = applyRegexes(regexes);

	var smallAM = exports.smallCapSpan('am');
	var smallPM = exports.smallCapSpan('pm');
	/** Small-cap typesetting of am & pm */
	var ampmRegexes = [
		[/\b[Aa]\.[Mm]\.(?=\s+[A-Z])/g, smallAM + '.'],
		[/\b[Pp]\.[Mm]\.(?=\s+[A-Z])/g, smallPM + '.'],
		[/\bA\.M\.(?!\w)/ig, smallAM],
		[/\bP\.M\.(?!\w)/ig, smallPM],
		[/\bA(\.?)M\1(?!\w)/g, smallAM],
		[/\bP(\.?)M\1(?!\w)/g, smallPM]
	];
	exports.ampm = applyRegexes(ampmRegexes);

	return exports;
})();

var ContentMapper = function(xpath) {
	var exports = {};

	var forAllNodes = function(mapper) {
		var nodes =
			document.evaluate(xpath, document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
		for (var i = 0; i < nodes.snapshotLength; i++) {
			var node = nodes.snapshotItem(i);
			mapper(node);
		}
	};

	var forUniqueNode = function(mapper) {
		var ccNodes =
			document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
		var ccn = ccNodes.singleNodeValue;
		if (ccn) {
			mapper(ccn);
		}
	};

	var Mapper = function(nodeLister, mapperBuilder) {
		var exports = {};

		var builder = function(mapper) {
			nodeLister(mapperBuilder(mapper));
		};

		exports.generic = builder;

		exports.regex = function(re, repl) {
			var mapper = function(s) { return s.replace(re, repl) };
			builder(mapper);
		}

		exports.multiRegex = function(regexes) {
			builder(RegexUtil.multiRegex(regexes));
		};

		return exports;
	};

	var MetaMapper = function(uncurried) {
		var builder = fjs.curry(uncurried);
		return {
			All:    Mapper(forAllNodes, builder),
			Unique: Mapper(forUniqueNode, builder)
		};
	};

	exports.foreach = forAllNodes;
	exports.Text = MetaMapper('mapper, n => n.data = mapper(n.data)');
	exports.Html = MetaMapper('mapper, n => n.innerHTML = mapper(n.innerHTML)');
	exports.OuterHtml = MetaMapper('mapper, n => n.outerHTML = mapper(n.outerHTML)');

	return exports;
};

var HtmlMapper = function(basePath, substring) {
	return ContentMapper(basePath + '//*[contains(text(), "' + substring.replace('"', '\\"') + '")]').Html
}

var constFn = function(n) { return (function(x) { return n; }); }


// *****************************************
// BEGINNING OF LOVECRAFT-SPECIFIC SCRIPTING
// *****************************************

var storyArea = '/html/body/center/table/tbody';
var storyHtml = fjs.curry(HtmlMapper)(storyArea);

// Apply basic beautification to the page.
var mapper = ContentMapper(storyArea + '//text()');
mapper.Text.All.generic(Beautifier.apply);

// Apply small-caps AM & PM typesetting.
var fullTextMapper = ContentMapper(storyArea);
fullTextMapper.Html.All.generic(Beautifier.ampm);

// General fixups for all HPL stories
mapper.Text.All.multiRegex([
	[/(\d+) degrees (\d+) minutes/g, '$1°$2′'],
	[/(\d+) degrees/g, '$1°'],
	[/Y\. M\. C\. A\./g, 'YMCA']
]);

// Get rid of the stupid flash stuff at the top & bottom
ContentMapper('//object').OuterHtml.All.generic(constFn(''));

// Story-specific fixups
var page = function(uf) { return window.location.href.indexOf(uf) > -1; }
if (page('index.html')) {
	var mainTablePath = '/html/body/center/table[1]';
	var storyElems = (function() {
		var count = 0;
		var storyElems = [];
		var storyNodes = mainTablePath + "//p/b/i/font/a";
		ContentMapper(storyNodes).foreach(function(n) {
			count += 1;
			var origHtml = n.outerHTML;
			var liHtml = '<li class="story">' + origHtml + '</li>';
			storyElems.push(liHtml);
		});
		return storyElems;
	})();
	ContentMapper(mainTablePath).OuterHtml.Unique.generic(function (n) {
		return '<ul id="stories">' + storyElems.join('\n') + '</ul>';
	})
	ContentMapper('/html/body/center/p/font//text()').Text.All.multiRegex([
		[/Dagon's H.P.Lovecraft/g, 'Dagon’s H.P. Lovecraft']
	])
}
if (page('thecallofcthulhu.htm')) {
	// Beautify a particular bit in Call of Cthulhu with small caps.
	storyHtml('headed \“CTHULHU CULT').Unique.regex(/CTHULHU CULT/g, Beautifier.smallCapSpan('cthulhu cult'));

	// Miscellaneous misspellings and errors.
	mapper.Text.All.multiRegex([
		[/the way clown toward/g, 'the way down toward'],
		[/stung th disappointment/g, 'stung with disappointment'],
		[/Persuad-g/g, 'Persuading'],
		[/l23°/g, '123°'],
		[/but johansen drove/g, 'but Johansen drove']
	]);
}
if (page('thedoomthatcametosarnath')) {
	mapper.Text.All.multiRegex([
		[/\b(?:lb|Th)\b/g, 'Ib']
	])
}
if (page('thetemple.htm')) {
	mapper.Text.All.multiRegex([
		[/August20/g, 'August 20'],
		[/with\.me/g, 'with me'],
		[/scene. as if frightened/g, 'scene, as if frightened'],
		[/slow, to, in/g, 'slow, too, in'],
		[/bad gone mad/g, 'had gone mad']
	])
}
if (page('theshadowoverinnsmouth.htm')) {
	storyHtml('Arkham-Innsmouth-Newburyport').Unique.regex(
		/Arkham-Innsmouth-Newburyport/g, '<i>Arkham–Innsmouth–Newburyport</i>'
	);
	mapper.Text.All.multiRegex([
		[/in it its neighbors/g, 'in its neighbors'],
		[/used to he a big/g, 'used to be a big'],
		[/became more and desolate/g, 'became more and more desolate'],
		[/once white paint/g, 'once-white paint'],
		[/ly-/g, 'ly '],
		[/‘lart\b/g, '’lart'],
		[/surface, That/g, 'surface. That'],
		[/was?['’]n['’]t/g, 'wa’n’t'],
		[/Wrath 0’/g, 'Wrath o’'],
		[/—-./g, '——.'],
		[/‘an\b/g, '’an'],
		[/0’/g, 'O’'],
		[/upharisn/g, 'upharsin'],
		[/Order O’ Dagon/g, 'Order o’ Dagon'],
		[/Masoic Hall/g, 'Masonic Hall'],
		[/…—proclamation/g, '… proclamation'],
		[/‘((?:twen|thir|for|fif|six|seven|eigh|nine)ty)/g, '’$1'],
		[/could he turned/g, 'could be turned'],
		[/Babeon/g, 'Babson'],
		[/received a shook/g, 'received a shock'],
		[/tied to hint/g, 'tried to hint']
	])
}
