'use client'

const bpePipelineSvg = `<svg id="bpe-pipeline" viewBox="0 0 640 410" width="100%" style="height:auto;max-width:100%;display:block;margin:0 auto;font-family:-apple-system,'Segoe UI',system-ui,sans-serif" role="img" aria-labelledby="bpe-pipeline-title bpe-pipeline-desc">
<title id="bpe-pipeline-title">One GPT-2 pretoken becomes four model tokens</title>
<desc id="bpe-pipeline-desc">A 64-byte sentence splits into seven GPT-2 pretokens. The microarchitectures pretoken is then shown passing through BPE and becoming four model tokens.</desc>
<defs><marker id="arrow-pipeline-desktop" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 Z" fill="var(--accent)"/></marker></defs>
<rect x="16" y="14" width="608" height="72" rx="8" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<text x="320" y="39" text-anchor="middle" fill="var(--foreground)" font-size="15" font-weight="650">One 64-byte GPT-2 input block</text>
<text x="320" y="62" text-anchor="middle" fill="var(--foreground)" font-size="9.5" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">·Gigatoken·optimises·pretokenisation·for·CPU·microarchitectures.</text>
<text x="320" y="79" text-anchor="middle" fill="var(--muted)" font-size="10">· = space byte</text>
<path d="M320 86 V109" fill="none" stroke="var(--accent)" stroke-width="2.5" marker-end="url(#arrow-pipeline-desktop)"/>
<text x="16" y="128" fill="var(--foreground)" font-size="14" font-weight="650">GPT-2 regex: 7 pretokens</text>
<rect x="16" y="138" width="95" height="44" rx="5" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<rect x="111" y="138" width="95" height="44" rx="5" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<rect x="206" y="138" width="152" height="44" rx="5" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<rect x="358" y="138" width="38" height="44" rx="5" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<rect x="396" y="138" width="38" height="44" rx="5" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<rect x="434" y="138" width="180.5" height="44" rx="5" fill="var(--background)" stroke="var(--foreground)" stroke-width="2.5"/>
<rect x="614.5" y="138" width="9.5" height="44" rx="3" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<text x="63.5" y="165" text-anchor="middle" fill="var(--foreground)" font-size="8.5" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">·Gigatoken</text>
<text x="158.5" y="165" text-anchor="middle" fill="var(--foreground)" font-size="8.5" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">·optimises</text>
<text x="282" y="165" text-anchor="middle" fill="var(--foreground)" font-size="9" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">·pretokenisation</text>
<text x="377" y="165" text-anchor="middle" fill="var(--foreground)" font-size="7.5" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">·for</text>
<text x="415" y="165" text-anchor="middle" fill="var(--foreground)" font-size="7.5" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">·CPU</text>
<text x="524.25" y="165" text-anchor="middle" fill="var(--foreground)" font-size="9" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">·microarchitectures</text>
<text x="619.25" y="165" text-anchor="middle" fill="var(--foreground)" font-size="8" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">.</text>
<path d="M524.25 182 V207 H320 V224" fill="none" stroke="var(--accent)" stroke-width="2.5" marker-end="url(#arrow-pipeline-desktop)"/>
<text x="458" y="202" text-anchor="middle" fill="var(--muted)" font-size="10.5">focus one pretoken</text>
<rect x="36" y="230" width="568" height="148" rx="8" fill="var(--background)" stroke="var(--foreground)" stroke-width="2"/>
<text x="320" y="255" text-anchor="middle" fill="var(--foreground)" font-size="15" font-weight="650">BPE inside one pretoken</text>
<text x="320" y="279" text-anchor="middle" fill="var(--foreground)" font-size="12.5" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">·microarchitectures</text>
<text x="320" y="302" text-anchor="middle" fill="var(--muted)" font-size="11.5">late merge: [it] + [ect] → [itect]</text>
<rect x="58" y="315" width="120" height="44" rx="6" fill="var(--rule-light)" stroke="var(--rule)" stroke-width="1.5"/>
<rect x="190" y="315" width="100" height="44" rx="6" fill="var(--rule-light)" stroke="var(--rule)" stroke-width="1.5"/>
<rect x="302" y="315" width="120" height="44" rx="6" fill="var(--rule-light)" stroke="var(--rule)" stroke-width="1.5"/>
<rect x="434" y="315" width="120" height="44" rx="6" fill="var(--rule-light)" stroke="var(--rule)" stroke-width="1.5"/>
<text x="118" y="334" text-anchor="middle" fill="var(--foreground)" font-size="11" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">[·micro]</text>
<text x="240" y="334" text-anchor="middle" fill="var(--foreground)" font-size="11" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">[arch]</text>
<text x="362" y="334" text-anchor="middle" fill="var(--foreground)" font-size="11" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">[itect]</text>
<text x="494" y="334" text-anchor="middle" fill="var(--foreground)" font-size="11" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">[ures]</text>
<text x="118" y="351" text-anchor="middle" fill="var(--muted)" font-size="9.5">ID 4580</text>
<text x="240" y="351" text-anchor="middle" fill="var(--muted)" font-size="9.5">ID 998</text>
<text x="362" y="351" text-anchor="middle" fill="var(--muted)" font-size="9.5">ID 5712</text>
<text x="494" y="351" text-anchor="middle" fill="var(--muted)" font-size="9.5">ID 942</text>
<text x="320" y="402" text-anchor="middle" fill="var(--foreground)" font-size="12.5" font-weight="650">1 pretoken → 4 model tokens · 7 pretokens → 15 model tokens overall</text>
</svg>`

const bpePipelineMobileSvg = `<svg id="bpe-pipeline-mobile" viewBox="0 0 360 445" width="100%" style="height:auto;max-width:100%;display:block;margin:0 auto;font-family:-apple-system,'Segoe UI',system-ui,sans-serif" role="img" aria-labelledby="bpe-pipeline-mobile-title bpe-pipeline-mobile-desc">
<title id="bpe-pipeline-mobile-title">One GPT-2 pretoken becomes four model tokens</title>
<desc id="bpe-pipeline-mobile-desc">A mobile layout showing a 64-byte sentence split into seven GPT-2 pretokens, with the microarchitectures pretoken becoming four model tokens.</desc>
<defs><marker id="arrow-pipeline-mobile" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 Z" fill="var(--accent)"/></marker></defs>
<rect x="10" y="12" width="340" height="88" rx="8" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<text x="180" y="36" text-anchor="middle" fill="var(--foreground)" font-size="15" font-weight="650">One 64-byte GPT-2 input block</text>
<text x="180" y="59" text-anchor="middle" fill="var(--foreground)" font-size="9.5" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">·Gigatoken·optimises·pretokenisation</text>
<text x="180" y="76" text-anchor="middle" fill="var(--foreground)" font-size="9.5" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">·for·CPU·microarchitectures.</text>
<text x="180" y="93" text-anchor="middle" fill="var(--muted)" font-size="9.5">· = space byte</text>
<path d="M180 100 V122" fill="none" stroke="var(--accent)" stroke-width="2.5" marker-end="url(#arrow-pipeline-mobile)"/>
<text x="12" y="141" fill="var(--foreground)" font-size="13.5" font-weight="650">GPT-2 regex: 7 pretokens</text>
<rect x="12" y="151" width="52.5" height="42" rx="4" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<rect x="64.5" y="151" width="52.5" height="42" rx="4" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<rect x="117" y="151" width="84" height="42" rx="4" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<rect x="201" y="151" width="21" height="42" rx="4" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<rect x="222" y="151" width="21" height="42" rx="4" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<rect x="243" y="151" width="99.75" height="42" rx="4" fill="var(--background)" stroke="var(--foreground)" stroke-width="2.5"/>
<rect x="342.75" y="151" width="5.25" height="42" rx="2" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<text x="38.25" y="176" text-anchor="middle" fill="var(--foreground)" font-size="8" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">Gig</text>
<text x="90.75" y="176" text-anchor="middle" fill="var(--foreground)" font-size="8" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">optim</text>
<text x="159" y="176" text-anchor="middle" fill="var(--foreground)" font-size="8" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">pretoken</text>
<text x="211.5" y="176" text-anchor="middle" fill="var(--foreground)" font-size="6.5" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">for</text>
<text x="232.5" y="176" text-anchor="middle" fill="var(--foreground)" font-size="6.5" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">CPU</text>
<text x="292.875" y="176" text-anchor="middle" fill="var(--foreground)" font-size="8" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">micro…</text>
<text x="345.375" y="176" text-anchor="middle" fill="var(--foreground)" font-size="7">.</text>
<path d="M292.875 193 V216 H180 V230" fill="none" stroke="var(--accent)" stroke-width="2.5" marker-end="url(#arrow-pipeline-mobile)"/>
<text x="258" y="212" text-anchor="middle" fill="var(--muted)" font-size="9.5">selected span</text>
<rect x="10" y="235" width="340" height="155" rx="8" fill="var(--background)" stroke="var(--foreground)" stroke-width="2"/>
<text x="180" y="260" text-anchor="middle" fill="var(--foreground)" font-size="14.5" font-weight="650">BPE inside one pretoken</text>
<text x="180" y="283" text-anchor="middle" fill="var(--foreground)" font-size="12" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">·microarchitectures</text>
<text x="180" y="306" text-anchor="middle" fill="var(--muted)" font-size="10.5">late merge: [it] + [ect] → [itect]</text>
<rect x="20" y="320" width="75" height="48" rx="5" fill="var(--rule-light)" stroke="var(--rule)" stroke-width="1.5"/>
<rect x="101" y="320" width="75" height="48" rx="5" fill="var(--rule-light)" stroke="var(--rule)" stroke-width="1.5"/>
<rect x="182" y="320" width="75" height="48" rx="5" fill="var(--rule-light)" stroke="var(--rule)" stroke-width="1.5"/>
<rect x="263" y="320" width="75" height="48" rx="5" fill="var(--rule-light)" stroke="var(--rule)" stroke-width="1.5"/>
<text x="57.5" y="340" text-anchor="middle" fill="var(--foreground)" font-size="9" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">[·micro]</text>
<text x="138.5" y="340" text-anchor="middle" fill="var(--foreground)" font-size="9" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">[arch]</text>
<text x="219.5" y="340" text-anchor="middle" fill="var(--foreground)" font-size="9" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">[itect]</text>
<text x="300.5" y="340" text-anchor="middle" fill="var(--foreground)" font-size="9" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">[ures]</text>
<text x="57.5" y="358" text-anchor="middle" fill="var(--muted)" font-size="8.5">4580</text>
<text x="138.5" y="358" text-anchor="middle" fill="var(--muted)" font-size="8.5">998</text>
<text x="219.5" y="358" text-anchor="middle" fill="var(--muted)" font-size="8.5">5712</text>
<text x="300.5" y="358" text-anchor="middle" fill="var(--muted)" font-size="8.5">942</text>
<text x="180" y="415" text-anchor="middle" fill="var(--foreground)" font-size="13" font-weight="650">1 pretoken → 4 model tokens</text>
<text x="180" y="435" text-anchor="middle" fill="var(--muted)" font-size="11">whole sentence: 7 pretokens → 15 tokens</text>
</svg>`

const maskScannerSvg = `<svg id="gigatoken-mask-scanner" viewBox="0 0 640 585" width="100%" style="height:auto;max-width:100%;display:block;margin:0 auto;font-family:-apple-system,'Segoe UI',system-ui,sans-serif" role="img" aria-labelledby="gigatoken-mask-title gigatoken-mask-desc">
<title id="gigatoken-mask-title">The common 64-byte mask-scanner path</title>
<desc id="gigatoken-mask-desc">A 64-byte ASCII sentence passes through SIMD classification and tokeniser-specific boundary rules. Seven start offsets partition the block into proportional pretoken spans.</desc>
<defs><marker id="arrow-mask-desktop" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 Z" fill="var(--accent)"/></marker></defs>
<rect x="30" y="14" width="580" height="76" rx="8" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<text x="320" y="39" text-anchor="middle" fill="var(--foreground)" font-size="15" font-weight="650">One complete 64-byte ASCII block</text>
<text x="320" y="62" text-anchor="middle" fill="var(--foreground)" font-size="9.5" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">·Gigatoken·optimises·pretokenisation·for·CPU·microarchitectures.</text>
<text x="320" y="80" text-anchor="middle" fill="var(--muted)" font-size="10">byte positions 0 to 63 · · = space byte</text>
<path d="M320 90 V110" fill="none" stroke="var(--accent)" stroke-width="2.5" marker-end="url(#arrow-mask-desktop)"/>
<rect x="90" y="115" width="460" height="62" rx="8" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<text x="320" y="140" text-anchor="middle" fill="var(--foreground)" font-size="15" font-weight="650">SIMD byte comparisons</text>
<text x="320" y="161" text-anchor="middle" fill="var(--muted)" font-size="11.5">classify many positions as letters, spaces and other byte classes</text>
<path d="M320 177 V198" fill="none" stroke="var(--accent)" stroke-width="2.5" marker-end="url(#arrow-mask-desktop)"/>
<rect x="90" y="202" width="460" height="62" rx="8" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<text x="320" y="227" text-anchor="middle" fill="var(--foreground)" font-size="15" font-weight="650">64-bit class masks</text>
<text x="320" y="248" text-anchor="middle" fill="var(--muted)" font-size="11.5">one mask per class · bit i describes byte i</text>
<path d="M320 264 V285" fill="none" stroke="var(--accent)" stroke-width="2.5" marker-end="url(#arrow-mask-desktop)"/>
<rect x="90" y="289" width="460" height="68" rx="8" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<text x="320" y="315" text-anchor="middle" fill="var(--foreground)" font-size="15" font-weight="650">Tokeniser-specific boundary rules in Rust</text>
<text x="320" y="338" text-anchor="middle" fill="var(--muted)" font-size="11.5">shift masks to align neighbours · combine them with AND, OR and NOT</text>
<path d="M320 357 V378" fill="none" stroke="var(--accent)" stroke-width="2.5" marker-end="url(#arrow-mask-desktop)"/>
<rect x="105" y="382" width="430" height="68" rx="8" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<text x="320" y="408" text-anchor="middle" fill="var(--foreground)" font-size="15" font-weight="650">Pretoken-start mask</text>
<text x="320" y="432" text-anchor="middle" fill="var(--foreground)" font-size="11.5" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">start offsets: 0 · 10 · 20 · 36 · 40 · 44 · 63</text>
<path d="M320 450 V471" fill="none" stroke="var(--accent)" stroke-width="2.5" marker-end="url(#arrow-mask-desktop)"/>
<text x="16" y="490" fill="var(--foreground)" font-size="13.5" font-weight="650">Seven ordered pretokens, scaled by byte length</text>
<rect x="16" y="500" width="95" height="48" rx="5" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<rect x="111" y="500" width="95" height="48" rx="5" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<rect x="206" y="500" width="152" height="48" rx="5" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<rect x="358" y="500" width="38" height="48" rx="5" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<rect x="396" y="500" width="38" height="48" rx="5" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<rect x="434" y="500" width="180.5" height="48" rx="5" fill="var(--background)" stroke="var(--foreground)" stroke-width="2"/>
<rect x="614.5" y="500" width="9.5" height="48" rx="3" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<text x="63.5" y="529" text-anchor="middle" fill="var(--foreground)" font-size="8.5" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">·Gigatoken</text>
<text x="158.5" y="529" text-anchor="middle" fill="var(--foreground)" font-size="8.5" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">·optimises</text>
<text x="282" y="529" text-anchor="middle" fill="var(--foreground)" font-size="9" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">·pretokenisation</text>
<text x="377" y="529" text-anchor="middle" fill="var(--foreground)" font-size="7.5" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">·for</text>
<text x="415" y="529" text-anchor="middle" fill="var(--foreground)" font-size="7.5" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">·CPU</text>
<text x="524.25" y="529" text-anchor="middle" fill="var(--foreground)" font-size="9" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">·microarchitectures</text>
<text x="619.25" y="529" text-anchor="middle" fill="var(--foreground)" font-size="8">.</text>
<text x="320" y="575" text-anchor="middle" fill="var(--muted)" font-size="11">segment lengths in bytes: 10 · 10 · 16 · 4 · 4 · 19 · 1</text>
</svg>`

const maskScannerMobileSvg = `<svg id="gigatoken-mask-scanner-mobile" viewBox="0 0 360 650" width="100%" style="height:auto;max-width:100%;display:block;margin:0 auto;font-family:-apple-system,'Segoe UI',system-ui,sans-serif" role="img" aria-labelledby="gigatoken-mask-mobile-title gigatoken-mask-mobile-desc">
<title id="gigatoken-mask-mobile-title">The common 64-byte mask-scanner path</title>
<desc id="gigatoken-mask-mobile-desc">A mobile layout showing a 64-byte ASCII sentence pass through SIMD classification and boundary rules before seven start offsets partition it into pretokens.</desc>
<defs><marker id="arrow-mask-mobile" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 Z" fill="var(--accent)"/></marker></defs>
<rect x="10" y="12" width="340" height="92" rx="8" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<text x="180" y="37" text-anchor="middle" fill="var(--foreground)" font-size="15" font-weight="650">One complete 64-byte ASCII block</text>
<text x="180" y="60" text-anchor="middle" fill="var(--foreground)" font-size="9.5" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">·Gigatoken·optimises·pretokenisation</text>
<text x="180" y="77" text-anchor="middle" fill="var(--foreground)" font-size="9.5" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">·for·CPU·microarchitectures.</text>
<text x="180" y="95" text-anchor="middle" fill="var(--muted)" font-size="9.5">byte positions 0 to 63 · · = space</text>
<path d="M180 104 V125" fill="none" stroke="var(--accent)" stroke-width="2.5" marker-end="url(#arrow-mask-mobile)"/>
<rect x="16" y="130" width="328" height="72" rx="8" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<text x="180" y="157" text-anchor="middle" fill="var(--foreground)" font-size="15" font-weight="650">SIMD byte comparisons</text>
<text x="180" y="181" text-anchor="middle" fill="var(--muted)" font-size="11">classify many byte positions at once</text>
<path d="M180 202 V223" fill="none" stroke="var(--accent)" stroke-width="2.5" marker-end="url(#arrow-mask-mobile)"/>
<rect x="16" y="228" width="328" height="64" rx="8" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<text x="180" y="254" text-anchor="middle" fill="var(--foreground)" font-size="15" font-weight="650">64-bit class masks</text>
<text x="180" y="277" text-anchor="middle" fill="var(--muted)" font-size="11">one bit describes each byte position</text>
<path d="M180 292 V313" fill="none" stroke="var(--accent)" stroke-width="2.5" marker-end="url(#arrow-mask-mobile)"/>
<rect x="16" y="318" width="328" height="76" rx="8" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<text x="180" y="345" text-anchor="middle" fill="var(--foreground)" font-size="14" font-weight="650">Tokeniser-specific rules in Rust</text>
<text x="180" y="369" text-anchor="middle" fill="var(--muted)" font-size="10.5">align neighbours with shifts</text>
<text x="180" y="385" text-anchor="middle" fill="var(--muted)" font-size="10.5">combine masks with AND, OR and NOT</text>
<path d="M180 394 V415" fill="none" stroke="var(--accent)" stroke-width="2.5" marker-end="url(#arrow-mask-mobile)"/>
<rect x="24" y="420" width="312" height="72" rx="8" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<text x="180" y="447" text-anchor="middle" fill="var(--foreground)" font-size="15" font-weight="650">Pretoken-start mask</text>
<text x="180" y="472" text-anchor="middle" fill="var(--foreground)" font-size="10.5" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">0 · 10 · 20 · 36 · 40 · 44 · 63</text>
<path d="M180 492 V513" fill="none" stroke="var(--accent)" stroke-width="2.5" marker-end="url(#arrow-mask-mobile)"/>
<text x="12" y="533" fill="var(--foreground)" font-size="13" font-weight="650">Seven ordered pretokens, scaled by length</text>
<rect x="12" y="545" width="52.5" height="42" rx="4" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<rect x="64.5" y="545" width="52.5" height="42" rx="4" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<rect x="117" y="545" width="84" height="42" rx="4" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<rect x="201" y="545" width="21" height="42" rx="4" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<rect x="222" y="545" width="21" height="42" rx="4" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<rect x="243" y="545" width="99.75" height="42" rx="4" fill="var(--background)" stroke="var(--foreground)" stroke-width="2"/>
<rect x="342.75" y="545" width="5.25" height="42" rx="2" fill="var(--background)" stroke="var(--rule)" stroke-width="2"/>
<text x="38.25" y="570" text-anchor="middle" fill="var(--foreground)" font-size="8" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">Gig</text>
<text x="90.75" y="570" text-anchor="middle" fill="var(--foreground)" font-size="8" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">optim</text>
<text x="159" y="570" text-anchor="middle" fill="var(--foreground)" font-size="8" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">pretoken</text>
<text x="211.5" y="570" text-anchor="middle" fill="var(--foreground)" font-size="6.5" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">for</text>
<text x="232.5" y="570" text-anchor="middle" fill="var(--foreground)" font-size="6.5" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">CPU</text>
<text x="292.875" y="570" text-anchor="middle" fill="var(--foreground)" font-size="8" font-family="ui-monospace,'SFMono-Regular',Consolas,monospace">micro…</text>
<text x="345.375" y="570" text-anchor="middle" fill="var(--foreground)" font-size="7">.</text>
<text x="180" y="616" text-anchor="middle" fill="var(--muted)" font-size="10.5">byte lengths: 10 · 10 · 16 · 4 · 4 · 19 · 1</text>
<text x="180" y="637" text-anchor="middle" fill="var(--foreground)" font-size="11.5" font-weight="650">start offsets partition the block in order</text>
</svg>`

const diagrams = {
  "bpe-pipeline": {
    "svg": bpePipelineSvg,
    "mobileSvg": bpePipelineMobileSvg,
    "caption": "The 64-byte example splits into seven GPT-2 pretokens, then BPE turns them into fifteen model tokens. The selected pretoken alone produces four: IDs 4580, 998, 5712 and 942."
  },
  "gigatoken-mask-scanner": {
    "svg": maskScannerSvg,
    "mobileSvg": maskScannerMobileSvg,
    "caption": "The sentence fills one 64-byte block. Its seven start offsets partition the input into ordered pretokens; <code>·</code> represents the space byte <code>0x20</code>. Carry and lookahead allow other pretokens to continue across block edges."
  },
  "gigatoken-unicode-path": {
    "svg": "<svg id=\"gigatoken-unicode-path\" viewBox=\"0 0 900 745\" width=\"100%\" style=\"height:auto;min-width:640px;display:block;margin:0 auto;font-family:-apple-system,'Segoe UI',system-ui,sans-serif\" role=\"img\" aria-labelledby=\"gigatoken-unicode-title gigatoken-unicode-desc\">\n<title id=\"gigatoken-unicode-title\">How Unicode rejoins the mask path</title>\n<desc id=\"gigatoken-unicode-desc\">SIMD creates ASCII class masks and a mask of non-ASCII byte positions. If that second mask is non-empty, Gigatoken decodes UTF-8 code points, looks up their classes and stamps each class across the character's bytes. Updated masks feed the tokeniser's boundary rules. An ordered walker reads proven start bits and uses exact scalar advance only through uncertain gaps.</desc>\n<defs><marker id=\"arrow-unicode\" markerWidth=\"9\" markerHeight=\"9\" refX=\"8\" refY=\"4.5\" orient=\"auto\"><path d=\"M0,0 L9,4.5 L0,9 Z\" fill=\"var(--accent)\"/></marker></defs>\n<rect x=\"215\" y=\"18\" width=\"470\" height=\"70\" rx=\"10\" fill=\"var(--accent-subtle)\" stroke=\"var(--rule)\" stroke-width=\"2\"/>\n<text x=\"450\" y=\"46\" text-anchor=\"middle\" fill=\"var(--foreground)\" font-size=\"16\" font-weight=\"650\">SIMD byte classification</text>\n<text x=\"450\" y=\"70\" text-anchor=\"middle\" fill=\"var(--muted)\" font-size=\"13\">ASCII class masks + non-ASCII-byte mask</text>\n<path d=\"M450 88 V114\" fill=\"none\" stroke=\"var(--accent)\" stroke-width=\"2.5\" marker-end=\"url(#arrow-unicode)\"/>\n<polygon points=\"450,118 575,163 450,208 325,163\" fill=\"var(--background)\" stroke=\"var(--rule)\" stroke-width=\"2\"/>\n<text x=\"450\" y=\"157\" text-anchor=\"middle\" fill=\"var(--foreground)\" font-size=\"14\" font-weight=\"650\">Any byte at or</text>\n<text x=\"450\" y=\"178\" text-anchor=\"middle\" fill=\"var(--foreground)\" font-size=\"14\">above 0x80?</text>\n<path d=\"M325 163 H170 V252\" fill=\"none\" stroke=\"var(--accent)\" stroke-width=\"2.5\" marker-end=\"url(#arrow-unicode)\"/>\n<text x=\"239\" y=\"150\" text-anchor=\"middle\" fill=\"var(--muted)\" font-size=\"12\">no</text>\n<rect x=\"35\" y=\"256\" width=\"270\" height=\"70\" rx=\"10\" fill=\"var(--background)\" stroke=\"var(--rule)\" stroke-width=\"2\"/>\n<text x=\"170\" y=\"284\" text-anchor=\"middle\" fill=\"var(--foreground)\" font-size=\"15\" font-weight=\"650\">Use the ASCII class masks</text>\n<text x=\"170\" y=\"308\" text-anchor=\"middle\" fill=\"var(--muted)\" font-size=\"12.5\">nothing else to classify</text>\n<path d=\"M575 163 H720 V222\" fill=\"none\" stroke=\"var(--accent)\" stroke-width=\"2.5\" marker-end=\"url(#arrow-unicode)\"/>\n<text x=\"646\" y=\"150\" text-anchor=\"middle\" fill=\"var(--muted)\" font-size=\"12\">yes</text>\n<rect x=\"550\" y=\"226\" width=\"340\" height=\"142\" rx=\"10\" fill=\"var(--background)\" stroke=\"var(--rule)\" stroke-width=\"2\"/>\n<text x=\"720\" y=\"254\" text-anchor=\"middle\" fill=\"var(--foreground)\" font-size=\"15\" font-weight=\"650\">Extend the masks for Unicode</text>\n<text x=\"720\" y=\"281\" text-anchor=\"middle\" fill=\"var(--muted)\" font-size=\"12.5\">1. find UTF-8 leads and decode code points</text>\n<text x=\"720\" y=\"307\" text-anchor=\"middle\" fill=\"var(--muted)\" font-size=\"12.5\">2. look up each character's packed class</text>\n<text x=\"720\" y=\"333\" text-anchor=\"middle\" fill=\"var(--muted)\" font-size=\"12.5\">3. stamp that class across its UTF-8 bytes</text>\n<text x=\"720\" y=\"354\" text-anchor=\"middle\" fill=\"var(--accent)\" font-size=\"12\">letter · number · whitespace · other</text>\n<path d=\"M170 326 V399 H330\" fill=\"none\" stroke=\"var(--accent)\" stroke-width=\"2.5\" marker-end=\"url(#arrow-unicode)\"/>\n<path d=\"M720 368 V399 H570\" fill=\"none\" stroke=\"var(--accent)\" stroke-width=\"2.5\" marker-end=\"url(#arrow-unicode)\"/>\n<rect x=\"330\" y=\"374\" width=\"240\" height=\"58\" rx=\"10\" fill=\"var(--accent-subtle)\" stroke=\"var(--rule)\" stroke-width=\"2\"/>\n<text x=\"450\" y=\"409\" text-anchor=\"middle\" fill=\"var(--foreground)\" font-size=\"15\" font-weight=\"650\">Updated class masks</text>\n<path d=\"M450 432 V459\" fill=\"none\" stroke=\"var(--accent)\" stroke-width=\"2.5\" marker-end=\"url(#arrow-unicode)\"/>\n<rect x=\"275\" y=\"463\" width=\"350\" height=\"66\" rx=\"10\" fill=\"var(--background)\" stroke=\"var(--rule)\" stroke-width=\"2\"/>\n<text x=\"450\" y=\"490\" text-anchor=\"middle\" fill=\"var(--foreground)\" font-size=\"15\" font-weight=\"650\">Tokeniser-specific boundary rules</text>\n<text x=\"450\" y=\"513\" text-anchor=\"middle\" fill=\"var(--muted)\" font-size=\"12.5\">operate over all 64 byte positions</text>\n<path d=\"M450 529 V556\" fill=\"none\" stroke=\"var(--accent)\" stroke-width=\"2.5\" marker-end=\"url(#arrow-unicode)\"/>\n<rect x=\"250\" y=\"560\" width=\"400\" height=\"66\" rx=\"10\" fill=\"var(--background)\" stroke=\"var(--rule)\" stroke-width=\"2\"/>\n<text x=\"450\" y=\"587\" text-anchor=\"middle\" fill=\"var(--foreground)\" font-size=\"15\" font-weight=\"650\">Batch result</text>\n<text x=\"450\" y=\"610\" text-anchor=\"middle\" fill=\"var(--muted)\" font-size=\"12.5\">proven start bits + bad-zone bits</text>\n<path d=\"M450 626 V653\" fill=\"none\" stroke=\"var(--accent)\" stroke-width=\"2.5\" marker-end=\"url(#arrow-unicode)\"/>\n<rect x=\"90\" y=\"657\" width=\"720\" height=\"70\" rx=\"10\" fill=\"var(--accent-subtle)\" stroke=\"var(--rule)\" stroke-width=\"2\"/>\n<text x=\"450\" y=\"684\" text-anchor=\"middle\" fill=\"var(--foreground)\" font-size=\"15\" font-weight=\"650\">One ordered boundary walker</text>\n<text x=\"450\" y=\"708\" text-anchor=\"middle\" fill=\"var(--muted)\" font-size=\"12.5\">read proven start bits · scalar-advance exactly through any uncertain gap · emit pretoken spans</text>\n</svg>",
    "caption": "Non-ASCII bytes receive a second classification pass that updates the masks. The scalar walker handles the remaining bad zones, then continues the same ordered boundary stream."
  },
  "gigatoken-cache-line": {
    "svg": "<svg id=\"gigatoken-cache-line\" viewBox=\"0 0 900 420\" width=\"100%\" style=\"height:auto;min-width:680px;display:block;margin:0 auto;font-family:-apple-system,'Segoe UI',system-ui,sans-serif\" role=\"img\" aria-labelledby=\"gigatoken-cache-title gigatoken-cache-desc\">\n<title id=\"gigatoken-cache-title\">Gigatoken's pretoken cache layout and prefetch ladder</title>\n<desc id=\"gigatoken-cache-desc\">Two 32-byte entries form one 64-byte probe bucket. A 256-span pipeline first requests the future target line in L2, then requests it in L1 sixteen probes before it is consumed.</desc>\n<defs><marker id=\"arrow-cache\" markerWidth=\"9\" markerHeight=\"9\" refX=\"8\" refY=\"4.5\" orient=\"auto\"><path d=\"M0,0 L9,4.5 L0,9 Z\" fill=\"var(--accent)\"/></marker></defs>\n<text x=\"25\" y=\"34\" fill=\"var(--foreground)\" font-size=\"16\" font-weight=\"650\">One 64-byte probe bucket</text>\n<rect x=\"25\" y=\"50\" width=\"850\" height=\"112\" rx=\"10\" fill=\"var(--background)\" stroke=\"var(--rule)\" stroke-width=\"2\"/>\n<rect x=\"25\" y=\"50\" width=\"425\" height=\"112\" rx=\"10\" fill=\"var(--accent-subtle)\" stroke=\"var(--rule)\" stroke-width=\"2\"/>\n<rect x=\"450\" y=\"50\" width=\"425\" height=\"112\" rx=\"10\" fill=\"var(--accent-subtle)\" stroke=\"var(--rule)\" stroke-width=\"2\"/>\n<line x1=\"237\" y1=\"50\" x2=\"237\" y2=\"162\" stroke=\"var(--rule)\" stroke-width=\"2\"/>\n<line x1=\"662\" y1=\"50\" x2=\"662\" y2=\"162\" stroke=\"var(--rule)\" stroke-width=\"2\"/>\n<text x=\"131\" y=\"82\" text-anchor=\"middle\" fill=\"var(--foreground)\" font-size=\"14\" font-weight=\"650\">Entry 0 key</text>\n<text x=\"131\" y=\"107\" text-anchor=\"middle\" fill=\"var(--muted)\" font-size=\"13\">u128 · 16 B</text>\n<text x=\"343\" y=\"82\" text-anchor=\"middle\" fill=\"var(--foreground)\" font-size=\"14\" font-weight=\"650\">inline IDs + spill ref</text>\n<text x=\"343\" y=\"107\" text-anchor=\"middle\" fill=\"var(--muted)\" font-size=\"13\">up to 4 token IDs</text>\n<text x=\"343\" y=\"131\" text-anchor=\"middle\" fill=\"var(--muted)\" font-size=\"12\">16 B</text>\n<text x=\"556\" y=\"82\" text-anchor=\"middle\" fill=\"var(--foreground)\" font-size=\"14\" font-weight=\"650\">Entry 1 key</text>\n<text x=\"556\" y=\"107\" text-anchor=\"middle\" fill=\"var(--muted)\" font-size=\"13\">u128 · 16 B</text>\n<text x=\"768\" y=\"82\" text-anchor=\"middle\" fill=\"var(--foreground)\" font-size=\"14\" font-weight=\"650\">inline IDs + spill ref</text>\n<text x=\"768\" y=\"107\" text-anchor=\"middle\" fill=\"var(--muted)\" font-size=\"13\">up to 4 token IDs</text>\n<text x=\"768\" y=\"131\" text-anchor=\"middle\" fill=\"var(--muted)\" font-size=\"12\">16 B</text>\n<text x=\"25\" y=\"211\" fill=\"var(--foreground)\" font-size=\"16\" font-weight=\"650\">Memory-latency pipeline over 256 pretokens</text>\n<rect x=\"25\" y=\"235\" width=\"240\" height=\"92\" rx=\"10\" fill=\"var(--background)\" stroke=\"var(--rule)\" stroke-width=\"2\"/>\n<text x=\"145\" y=\"266\" text-anchor=\"middle\" fill=\"var(--foreground)\" font-size=\"14\" font-weight=\"650\">Discover span</text>\n<text x=\"145\" y=\"290\" text-anchor=\"middle\" fill=\"var(--muted)\" font-size=\"13\">pack key + hash</text>\n<text x=\"145\" y=\"311\" text-anchor=\"middle\" fill=\"var(--accent)\" font-size=\"13\">request target line in L2</text>\n<path d=\"M265 281 H345\" fill=\"none\" stroke=\"var(--accent)\" stroke-width=\"2.5\" marker-end=\"url(#arrow-cache)\"/>\n<rect x=\"350\" y=\"235\" width=\"230\" height=\"92\" rx=\"10\" fill=\"var(--background)\" stroke=\"var(--rule)\" stroke-width=\"2\"/>\n<text x=\"465\" y=\"266\" text-anchor=\"middle\" fill=\"var(--foreground)\" font-size=\"14\" font-weight=\"650\">16 probes ahead</text>\n<text x=\"465\" y=\"290\" text-anchor=\"middle\" fill=\"var(--muted)\" font-size=\"13\">request line in L1</text>\n<text x=\"465\" y=\"311\" text-anchor=\"middle\" fill=\"var(--accent)\" font-size=\"13\">prefetch hint</text>\n<path d=\"M580 281 H660\" fill=\"none\" stroke=\"var(--accent)\" stroke-width=\"2.5\" marker-end=\"url(#arrow-cache)\"/>\n<rect x=\"665\" y=\"235\" width=\"210\" height=\"92\" rx=\"10\" fill=\"var(--accent-subtle)\" stroke=\"var(--rule)\" stroke-width=\"2\"/>\n<text x=\"770\" y=\"266\" text-anchor=\"middle\" fill=\"var(--foreground)\" font-size=\"14\" font-weight=\"650\">Probe + emit</text>\n<text x=\"770\" y=\"290\" text-anchor=\"middle\" fill=\"var(--muted)\" font-size=\"13\">compare both keys</text>\n<text x=\"770\" y=\"311\" text-anchor=\"middle\" fill=\"var(--muted)\" font-size=\"13\">write 1 to 4 IDs</text>\n<rect x=\"214\" y=\"362\" width=\"472\" height=\"42\" rx=\"9\" fill=\"var(--background)\" stroke=\"var(--accent-muted)\" stroke-width=\"2\" stroke-dasharray=\"6 5\"/>\n<text x=\"450\" y=\"388\" text-anchor=\"middle\" fill=\"var(--muted)\" font-size=\"12.5\">displaced hit, spill, long pretoken or miss → slow path</text>\n</svg>",
    "caption": "The key and the usual answer sit in the same 64-byte probe bucket, which fits within one hardware cache line. Software prefetches try to make that line resident before the probe needs it."
  },
  "gigatoken-parallel": {
    "svg": "<svg id=\"gigatoken-parallel\" viewBox=\"0 0 900 500\" width=\"100%\" style=\"height:auto;min-width:680px;display:block;margin:0 auto;font-family:-apple-system,'Segoe UI',system-ui,sans-serif\" role=\"img\" aria-labelledby=\"gigatoken-parallel-title gigatoken-parallel-desc\">\n<title id=\"gigatoken-parallel-title\">Gigatoken's coarse parallel scheduling and output assembly</title>\n<desc id=\"gigatoken-parallel-desc\">A large input is cut at pretoken-safe boundaries into large early chunks and smaller tail chunks. Worker tasks pull chunks through an atomic index, use exclusive mutable state, then copy ready chunks into a flat output buffer in input order.</desc>\n<defs><marker id=\"arrow-parallel\" markerWidth=\"9\" markerHeight=\"9\" refX=\"8\" refY=\"4.5\" orient=\"auto\"><path d=\"M0,0 L9,4.5 L0,9 Z\" fill=\"var(--accent)\"/></marker></defs>\n<text x=\"25\" y=\"31\" fill=\"var(--foreground)\" font-size=\"15\" font-weight=\"650\">One large input, cut only at safe boundaries</text>\n<rect x=\"25\" y=\"48\" width=\"190\" height=\"54\" rx=\"7\" fill=\"var(--background)\" stroke=\"var(--foreground)\" stroke-width=\"2\"/>\n<rect x=\"218\" y=\"48\" width=\"190\" height=\"54\" rx=\"7\" fill=\"var(--background)\" stroke=\"var(--foreground)\" stroke-width=\"2\"/>\n<rect x=\"411\" y=\"48\" width=\"190\" height=\"54\" rx=\"7\" fill=\"var(--background)\" stroke=\"var(--foreground)\" stroke-width=\"2\"/>\n<rect x=\"604\" y=\"48\" width=\"95\" height=\"54\" rx=\"7\" fill=\"var(--background)\" stroke=\"var(--rule)\" stroke-width=\"2\" stroke-dasharray=\"5 4\"/>\n<rect x=\"702\" y=\"48\" width=\"78\" height=\"54\" rx=\"7\" fill=\"var(--background)\" stroke=\"var(--rule)\" stroke-width=\"2\" stroke-dasharray=\"5 4\"/>\n<rect x=\"783\" y=\"48\" width=\"78\" height=\"54\" rx=\"7\" fill=\"var(--background)\" stroke=\"var(--rule)\" stroke-width=\"2\" stroke-dasharray=\"5 4\"/>\n<text x=\"313\" y=\"81\" text-anchor=\"middle\" fill=\"var(--foreground)\" font-size=\"13\">large head chunks</text>\n<text x=\"733\" y=\"81\" text-anchor=\"middle\" fill=\"var(--foreground)\" font-size=\"12\">small tail</text>\n<path d=\"M450 102 V142\" fill=\"none\" stroke=\"var(--accent)\" stroke-width=\"2.5\" marker-end=\"url(#arrow-parallel)\"/>\n<rect x=\"275\" y=\"147\" width=\"350\" height=\"52\" rx=\"9\" fill=\"var(--background)\" stroke=\"var(--rule)\" stroke-width=\"2\"/>\n<text x=\"450\" y=\"178\" text-anchor=\"middle\" fill=\"var(--foreground)\" font-size=\"14\" font-weight=\"650\">large head chunks first, then the small tail</text>\n<path d=\"M450 199 V220\" fill=\"none\" stroke=\"var(--accent)\" stroke-width=\"2.5\" marker-end=\"url(#arrow-parallel)\"/>\n<rect x=\"300\" y=\"225\" width=\"300\" height=\"55\" rx=\"9\" fill=\"var(--background)\" stroke=\"var(--rule)\" stroke-width=\"2\"/>\n<text x=\"450\" y=\"248\" text-anchor=\"middle\" fill=\"var(--foreground)\" font-size=\"14\" font-weight=\"650\">shared model + atomic chunk index</text>\n<text x=\"450\" y=\"268\" text-anchor=\"middle\" fill=\"var(--muted)\" font-size=\"12\">tasks pull one chunk at a time</text>\n<path d=\"M370 280 L170 321\" fill=\"none\" stroke=\"var(--accent)\" stroke-width=\"2.5\" marker-end=\"url(#arrow-parallel)\"/>\n<path d=\"M450 280 V321\" fill=\"none\" stroke=\"var(--accent)\" stroke-width=\"2.5\" marker-end=\"url(#arrow-parallel)\"/>\n<path d=\"M530 280 L730 321\" fill=\"none\" stroke=\"var(--accent)\" stroke-width=\"2.5\" marker-end=\"url(#arrow-parallel)\"/>\n<rect x=\"55\" y=\"326\" width=\"230\" height=\"92\" rx=\"10\" fill=\"var(--background)\" stroke=\"var(--rule)\" stroke-width=\"2\"/>\n<rect x=\"335\" y=\"326\" width=\"230\" height=\"92\" rx=\"10\" fill=\"var(--background)\" stroke=\"var(--rule)\" stroke-width=\"2\"/>\n<rect x=\"615\" y=\"326\" width=\"230\" height=\"92\" rx=\"10\" fill=\"var(--background)\" stroke=\"var(--rule)\" stroke-width=\"2\"/>\n<text x=\"170\" y=\"353\" text-anchor=\"middle\" fill=\"var(--foreground)\" font-size=\"14\" font-weight=\"650\">Worker task 0</text>\n<text x=\"170\" y=\"377\" text-anchor=\"middle\" fill=\"var(--muted)\" font-size=\"12\">exclusive cache + scratch</text>\n<text x=\"170\" y=\"399\" text-anchor=\"middle\" fill=\"var(--foreground)\" font-size=\"12\">chunk token buffer</text>\n<text x=\"450\" y=\"353\" text-anchor=\"middle\" fill=\"var(--foreground)\" font-size=\"14\" font-weight=\"650\">Worker task 1</text>\n<text x=\"450\" y=\"377\" text-anchor=\"middle\" fill=\"var(--muted)\" font-size=\"12\">exclusive cache + scratch</text>\n<text x=\"450\" y=\"399\" text-anchor=\"middle\" fill=\"var(--foreground)\" font-size=\"12\">chunk token buffer</text>\n<text x=\"730\" y=\"353\" text-anchor=\"middle\" fill=\"var(--foreground)\" font-size=\"14\" font-weight=\"650\">Worker task N</text>\n<text x=\"730\" y=\"377\" text-anchor=\"middle\" fill=\"var(--muted)\" font-size=\"12\">exclusive cache + scratch</text>\n<text x=\"730\" y=\"399\" text-anchor=\"middle\" fill=\"var(--foreground)\" font-size=\"12\">chunk token buffer</text>\n<path d=\"M170 418 V451 H390\" fill=\"none\" stroke=\"var(--accent)\" stroke-width=\"2.5\" marker-end=\"url(#arrow-parallel)\"/>\n<path d=\"M450 418 V451\" fill=\"none\" stroke=\"var(--accent)\" stroke-width=\"2.5\" marker-end=\"url(#arrow-parallel)\"/>\n<path d=\"M730 418 V451 H510\" fill=\"none\" stroke=\"var(--accent)\" stroke-width=\"2.5\" marker-end=\"url(#arrow-parallel)\"/>\n<rect x=\"285\" y=\"451\" width=\"330\" height=\"42\" rx=\"9\" fill=\"var(--background)\" stroke=\"var(--rule)\" stroke-width=\"2\"/>\n<text x=\"450\" y=\"477\" text-anchor=\"middle\" fill=\"var(--foreground)\" font-size=\"13.5\" font-weight=\"650\">commit cursor copies chunks in input order</text>\n</svg>",
    "caption": "Each active task holds one mutable state slot exclusively. Shared work distribution and output assembly operate at chunk granularity."
  }
} as const

type DiagramProps = {
  svg: string
  mobileSvg?: string
  caption: string
}

function GigatokenDiagram({svg, mobileSvg, caption}: DiagramProps) {
  return (
    <figure className="my-10 w-full overflow-x-auto">
      {mobileSvg ? (
        <>
          <div className="hidden md:block" dangerouslySetInnerHTML={{__html: svg}} />
          <div className="block md:hidden" dangerouslySetInnerHTML={{__html: mobileSvg}} />
        </>
      ) : (
        <div dangerouslySetInnerHTML={{__html: svg}} />
      )}
      <figcaption
        className="mt-3 text-sm leading-6"
        style={{color: 'var(--muted)'}}
        dangerouslySetInnerHTML={{__html: caption}}
      />
    </figure>
  )
}

export function GigatokenBpePipeline() {
  return <GigatokenDiagram {...diagrams['bpe-pipeline']} />
}

export function GigatokenMaskScanner() {
  return <GigatokenDiagram {...diagrams['gigatoken-mask-scanner']} />
}

export function GigatokenUnicodePath() {
  return <GigatokenDiagram {...diagrams['gigatoken-unicode-path']} />
}

export function GigatokenCacheLine() {
  return <GigatokenDiagram {...diagrams['gigatoken-cache-line']} />
}

export function GigatokenParallel() {
  return <GigatokenDiagram {...diagrams['gigatoken-parallel']} />
}
