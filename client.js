/**
 * Thinking-strength slider — Client half.
 *
 * Replaces the composer model seat (`conversation.input.model`) with a variant
 * that keeps the model list and turns the discrete reasoning-effort button list
 * into a snap-to-gear slider, following the design of the MIT-licensed
 * https://github.com/Motuo24/dsh-thinking-slider plugin.
 *
 * Data and submission ride the shipped per-session `ModelDirectory`
 * (`ctx.modelDirectories`) and `session.selectModel`, so `/model` and the model
 * row always agree with the slider. The seat shadows the shipped one at a lower
 * priority; removing the bundle restores the original buttons.
 *
 * One framework consequence: a shadowing entry cannot declare the seat's
 * `conversation.input.model.label` child slot (the shipped entry already
 * declared it), so the label seat is rendered here through its registered
 * component with an error boundary — that keeps decorations such as the
 * DeepSeek "1017" chip working instead of dropping them.
 */
window.__ModuleLoader__.load({
	id: '@stars-twinkle/dsh-reasoning-slider',
	factory(require) {
		const React = require('react');
		const ReactDOM = require('react-dom');
		const h = React.createElement;
		const { useState, useRef, useEffect, useLayoutEffect, useMemo, useSyncExternalStore, useId } = React;

		const PKG = '@stars-twinkle/dsh-reasoning-slider';
		const NS = 'reasoning-slider';
		const MENU_WIDTH = 280;
		const THUMB_SIZE = 40;
		const MEASURE_STYLE = { visibility: 'hidden', left: 0, top: 0 };
		/** Levels offered when an adapter exposes no reasoning metadata at all. */
		const FALLBACK_EFFORTS = [
			{ id: 'low', name: 'Low' },
			{ id: 'medium', name: 'Medium' },
			{ id: 'high', name: 'High' },
			{ id: 'max', name: 'Max' },
			{ id: 'xhigh', name: 'X-High' },
		];
		/** White motes streaming along the filled track at the highest gear. */
		const FLOW_PARTICLES = [
			{ top: 18, delay: 0, duration: 2.2, size: 2.4 },
			{ top: 42, delay: 0.22, duration: 2.8, size: 1.9 },
			{ top: 66, delay: 0.44, duration: 2.0, size: 2.8 },
			{ top: 28, delay: 0.66, duration: 3.0, size: 2.1 },
			{ top: 56, delay: 0.88, duration: 2.5, size: 1.7 },
			{ top: 36, delay: 1.1, duration: 2.1, size: 2.6 },
			{ top: 72, delay: 1.32, duration: 2.9, size: 2.0 },
			{ top: 22, delay: 1.54, duration: 2.3, size: 2.3 },
			{ top: 48, delay: 1.76, duration: 2.6, size: 1.8 },
			{ top: 62, delay: 1.98, duration: 2.0, size: 2.5 },
			{ top: 32, delay: 2.2, duration: 2.7, size: 2.0 },
			{ top: 74, delay: 2.42, duration: 2.4, size: 2.2 },
			{ top: 14, delay: 2.64, duration: 2.9, size: 1.8 },
			{ top: 52, delay: 2.86, duration: 2.2, size: 2.6 },
			{ top: 40, delay: 3.08, duration: 2.5, size: 2.0 },
			{ top: 68, delay: 3.3, duration: 2.1, size: 2.3 },
		];

		const CSS = `
.rsi_root{position:relative;min-width:0;--rsi-accent:var(--dsw-alias-state-business-primary,#5686fe)}
.rsi_trigger{display:flex;align-items:center;gap:6px;height:28px;min-width:0;max-width:min(320px,45cqw);padding:0 5px 0 8px;border:none;border-radius:24px;background:transparent;color:var(--dsw-alias-label-secondary,#9aa0a6);font-family:inherit;font-size:13px;font-weight:500;line-height:20px;cursor:pointer;outline:none}
.rsi_trigger:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08))}
.rsi_trigger:focus-visible{box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--rsi-accent))}
.rsi_trigger:disabled{color:var(--dsw-alias-label-dimmed,#6b7075);cursor:default}
.rsi_triggerIcon{display:var(--dsh-composer-model-icon-display,none);flex:none}
.rsi_triggerLabel{display:var(--dsh-composer-model-text-display,block);align-items:center;gap:4px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rsi_triggerEffort{display:var(--dsh-composer-model-text-display,block);flex:none;color:var(--dsw-alias-label-caption,#8b9196);overflow:hidden;white-space:nowrap}
.rsi_chevron{display:grid;place-items:center;flex:none;color:var(--dsw-alias-label-caption,#8b9196);transition:transform .12s ease}
.rsi_chevronOpen{transform:rotate(180deg)}
.rsi_menu{--rsi-accent:var(--dsw-alias-state-business-primary,#5686fe);--rsi-track:color-mix(in srgb,var(--dsw-alias-label-primary,#e8eaed) 13%,transparent);position:fixed;z-index:1100;display:flex;flex-direction:column;box-sizing:border-box;width:${MENU_WIDTH}px;max-width:calc(100vw - 24px);max-height:min(460px,calc(100vh - 80px));padding:8px;border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.1));border-radius:14px;background:var(--dsw-specific-menu,var(--dsw-alias-bg-layer-2,#303136f0));-webkit-backdrop-filter:saturate(1.35) blur(18px);backdrop-filter:saturate(1.35) blur(18px);color:var(--dsw-alias-label-primary,#e8eaed);--dsw-elevation-stroke-color:var(--dsw-alias-border-l1,rgba(255,255,255,.1));box-shadow:var(--dsw-elevation-prominent,0 0 0 .5px rgba(0,0,0,.2));overflow:visible}
.rsi_cell{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;box-sizing:border-box;width:100%;min-height:34px;padding:0 10px;border:none;border-radius:8px;background:transparent;color:inherit;font-family:inherit;font-size:13px;line-height:20px;text-align:left;cursor:pointer;outline:none}
.rsi_cell:hover,.rsi_cell:focus-visible{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08))}
.rsi_cellLabel{justify-self:start;min-width:0;font-weight:600;color:var(--dsw-alias-label-primary,#e8eaed)}
.rsi_cellValue{display:flex;align-items:center;justify-content:center;justify-self:center;gap:4px;min-width:0;max-width:100%;color:var(--dsw-alias-label-primary,#e8eaed);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rsi_cellChevron{justify-self:end;display:grid;place-items:center;color:var(--dsw-alias-label-tertiary,#8b9196)}
.rsi_effortRow{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;height:24px;margin-top:2px;padding:0 10px}
.rsi_effortLabel{grid-column:1;justify-self:start;font-size:13px;font-weight:600;line-height:20px;color:var(--dsw-alias-label-primary,#e8eaed)}
.rsi_effortHint{grid-column:2;justify-self:center;max-width:100%;font-size:11px;line-height:16px;color:var(--dsw-alias-label-caption,#8b9196);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rsi_effortValue{grid-column:3;justify-self:end;max-width:100%;font-size:13px;font-weight:600;line-height:20px;color:var(--dsw-alias-label-primary,#e8eaed);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rsi_paneHead{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;line-height:20px;color:var(--dsw-alias-label-primary,#e8eaed)}
.rsi_back{display:grid;place-items:center;width:24px;height:24px;padding:0;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary,#9aa0a6);cursor:pointer;outline:none}
.rsi_back:hover,.rsi_back:focus-visible{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08))}
.rsi_slider{--rsi-accent:var(--dsw-alias-state-business-primary,#5686fe);position:relative;flex:none;height:34px;margin:8px 8px 11px}
.rsi_sliderInner{position:absolute;inset:0;border-radius:inherit}
.rsi_trackBg{border-radius:999px}
.rsi_veil{border-radius:999px}
.rsi_fill{position:absolute;left:0;top:0;height:100%;border-radius:999px;overflow:hidden;background:var(--rsi-accent);z-index:1}
.rsi_fillMax{background:linear-gradient(90deg,var(--rsi-accent) 0%,#7c5cff 55%,#b06bff 100%);box-shadow:0 0 10px rgba(124,92,255,.55)}
.rsi_flow{position:absolute;border-radius:999px;overflow:hidden;pointer-events:none}
.rsi_particle{position:absolute;left:0;border-radius:50%;background:#fff;box-shadow:0 0 4px rgba(255,255,255,.95),0 0 9px rgba(168,133,255,.85);opacity:0;animation-name:rsi-drift;animation-timing-function:linear;animation-iteration-count:infinite;will-change:transform,opacity}
@keyframes rsi-drift{0%{transform:translateX(-8px) scale(.5);opacity:0}8%{opacity:1}70%{opacity:1}100%{transform:translateX(320px) scale(1);opacity:0}}
.rsi_dot{position:absolute;top:50%;width:6px;height:6px;border-radius:50%;transform:translate(-50%,-50%);background:rgba(128,128,128,.45);z-index:2;pointer-events:none;transition:background .15s ease-out}
.rsi_dotOn{background:#fff}
.rsi_range{position:absolute;left:0;top:0;width:100%;height:100%;margin:0;padding:0;opacity:0;cursor:pointer;z-index:4;-webkit-appearance:none;appearance:none}
.rsi_range:disabled{cursor:default}
.rsi_thumb{pointer-events:none}
.rsi_thumbPulse{animation:rsi-snap .32s cubic-bezier(.34,1.56,.64,1)}
@keyframes rsi-snap{0%{transform:translate(-50%,-50%) scale(1)}35%{transform:translate(-50%,-50%) scale(1.06)}65%{transform:translate(-50%,-50%) scale(.98)}100%{transform:translate(-50%,-50%) scale(1)}}
.rsi_modelPane{display:flex;flex-direction:column;min-height:0;flex:1}
.rsi_fallback{display:flex;align-items:center;height:28px;padding:0 8px;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary,#9aa0a6);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rsi_searchRow{position:relative;margin:2px 4px 4px}
.rsi_search{box-sizing:border-box;width:100%;height:30px;padding:0 30px 0 9px;border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.12));border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary,#e8eaed);font-family:inherit;font-size:12px;line-height:18px;outline:none}
.rsi_search:focus{border-color:var(--rsi-accent)}
.rsi_search::placeholder{color:var(--dsw-alias-label-caption,#8b9196)}
.rsi_searchClear{position:absolute;right:4px;top:50%;display:grid;place-items:center;width:22px;height:22px;padding:0;transform:translateY(-50%);border:none;border-radius:50%;background:transparent;color:var(--dsw-alias-label-secondary,#9aa0a6);cursor:pointer;outline:none}
.rsi_searchClear:hover,.rsi_searchClear:focus-visible{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08))}
.rsi_groups{display:flex;flex-direction:column;gap:1px;min-height:0;overflow-y:auto;border-radius:8px;scrollbar-width:thin}
.rsi_group{padding:2px 0 4px}
.rsi_groupTitle{padding:5px 8px 2px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary,#8b9196)}
.rsi_option{display:flex;align-items:flex-start;gap:8px;box-sizing:border-box;width:100%;min-height:34px;padding:5px 8px;border:none;border-radius:8px;background:transparent;color:inherit;font-family:inherit;font-size:13px;line-height:20px;text-align:left;cursor:pointer;outline:none}
.rsi_option:hover:not(:disabled),.rsi_option:focus-visible{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08))}
.rsi_option:disabled{color:var(--dsw-alias-label-dimmed,#6b7075);cursor:default}
.rsi_optionCopy{display:flex;flex-direction:column;flex:1;min-width:0}
.rsi_modelName{display:flex;align-items:center;gap:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rsi_modelDesc{font-size:12px;line-height:16px;color:var(--dsw-alias-label-caption,#8b9196)}
.rsi_check{display:grid;place-items:center;flex:none;width:16px;color:var(--rsi-accent)}
.rsi_status{padding:10px 8px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary,#8b9196)}
.rsi_error{margin:4px;padding:7px 8px;border-radius:8px;background:var(--dsw-alias-interactive-bg-hover-danger,rgba(255,80,80,.14));color:var(--dsw-alias-state-error-primary,#ff6b6b);font-size:12px;line-height:18px}
.rsi_warning{margin:4px;padding:7px 8px;border-radius:8px;background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.04));color:var(--dsw-alias-state-warn-primary,#e0a83c);font-size:12px;line-height:18px}
@media (prefers-reduced-motion: reduce){.rsi_thumb,.rsi_fill,.rsi_dot,.rsi_chevron{transition:none}.rsi_thumbPulse{animation:none}.rsi_particle{animation:none;opacity:0}}
`;

		/** Simplified Chinese dictionary (key-set source of truth). */
		const zh = {
			'provider.account': 'DeepSeek 账号',
			'menu.aria': '模型与思考强度',
			'menu.model': '模型',
			'menu.effort': '思考强度',
			'trigger.fallback': '选择模型',
			'trigger.loading': '正在加载模型…',
			'trigger.selectAria': '选择模型',
			'trigger.aria': '选择模型，当前 {model}',
			'trigger.ariaEffort': '选择模型，当前 {model}，思考强度 {effort}',
			'effort.providerDefault': 'Default',
			'effort.quotaHint': '将更快消耗使用额度',
			'slider.aria': '思考强度：{effort}',
			'back.label': '返回',
			'status.loading': '正在刷新模型列表…',
			'error.action': '模型操作失败：{message}',
			'error.directory': '模型目录不可用：{message}',
			'error.sessionInUse': '当前会话已被占用，可能是其他正在运行的 DSH 导致的（如其他 dsh web、桌面端），请退出其他正在运行的 DSH 后重试。',
			'warning.groupLoad': '{name} 加载失败：{message}',
			'search.placeholder': '搜索模型…',
			'search.clear': '清除搜索',
			'search.empty': '没有匹配的模型。',
			'empty.models': '没有可用的模型。',
			'empty.efforts': '当前模型未提供思考强度等级。',
		};

		/** English dictionary, complete against the zh key set. */
		const en = {
			'provider.account': 'DeepSeek Account',
			'menu.aria': 'Model and thinking strength',
			'menu.model': 'Model',
			'menu.effort': 'Thinking strength',
			'trigger.fallback': 'Select model',
			'trigger.loading': 'Loading models…',
			'trigger.selectAria': 'Select model',
			'trigger.aria': 'Select model, current {model}',
			'trigger.ariaEffort': 'Select model, current {model}, thinking strength {effort}',
			'effort.providerDefault': 'Default',
			'effort.quotaHint': 'Consumes your quota faster',
			'slider.aria': 'Thinking strength: {effort}',
			'back.label': 'Back',
			'status.loading': 'Refreshing model list…',
			'error.action': 'Model operation failed: {message}',
			'error.directory': 'Model directory unavailable: {message}',
			'error.sessionInUse': 'This session is already in use, possibly by another running DSH instance (such as dsh web or the desktop app). Quit other running DSH instances and try again.',
			'warning.groupLoad': '{name} failed to load: {message}',
			'search.placeholder': 'Search models…',
			'search.clear': 'Clear search',
			'search.empty': 'No matching models.',
			'empty.models': 'No models available.',
			'empty.efforts': 'This model provides no thinking strength levels.',
		};

		const clamp = (value, min, max) => (value < min ? min : value > max ? max : value);
		const providerRank = (id) => (id === 'deepseek-account' ? 0 : id === 'deepseek-official' ? 1 : 2);
		const orderGroups = (groups) => groups.slice().sort((left, right) => providerRank(left.id) - providerRank(right.id));

		/** Ordered-subsequence name match; lower scores rank first, -1 means no match. */
		function nameScore(name, query) {
			if (query === '') return 0;
			const haystack = name.toLowerCase();
			const needle = query.toLowerCase();
			if (haystack.startsWith(needle)) return 0;
			let cursor = 0;
			let gaps = 0;
			for (const character of needle) {
				const at = haystack.indexOf(character, cursor);
				if (at < 0) return -1;
				gaps += at - cursor;
				cursor = at + 1;
			}
			return 1 + gaps;
		}

		/** Filter one provider's models, preserving catalog order among equal scores. */
		function filterModels(models, query) {
			if (query === '') return models;
			const scored = [];
			models.forEach((model, order) => {
				const score = nameScore(model.name, query);
				if (score >= 0) scored.push({ model, score, order });
			});
			scored.sort((left, right) => left.score - right.score || left.order - right.order);
			return scored.map((entry) => entry.model);
		}

		function Svg({ children, className, size = 16, strokeWidth = 1.5 }) {
			return h(
				'svg',
				{
					className,
					width: size,
					height: size,
					viewBox: '0 0 16 16',
					fill: 'none',
					stroke: 'currentColor',
					strokeWidth,
					strokeLinecap: 'round',
					strokeLinejoin: 'round',
					'aria-hidden': 'true',
					focusable: 'false',
					style: { display: 'block' },
				},
				children,
			);
		}

		const Check = (props) => h(Svg, props, h('path', { d: 'M3.5 8.5 6.5 11.5 12.5 5' }));
		const ChevronDown = (props) => h(Svg, { ...props, strokeWidth: 1.6 }, h('path', { d: 'M4 6 8 10 12 6' }));
		const ChevronRight = (props) => h(Svg, { ...props, strokeWidth: 1.6 }, h('path', { d: 'M6 4 10 8 6 12' }));
		const ChevronLeft = (props) => h(Svg, { ...props, strokeWidth: 1.6 }, h('path', { d: 'M10 4 6 8 10 12' }));
		const CloseIcon = (props) => h(Svg, props, h('path', { d: 'M4.2 4.2 11.8 11.8M11.8 4.2 4.2 11.8' }));
		const ModelIcon = (props) =>
			h(
				Svg,
				props,
				h('path', { d: 'M8 2.3 13.4 5 8 7.7 2.6 5 8 2.3Z' }),
				h('path', { d: 'M2.6 8.1 8 10.8 13.4 8.1' }),
				h('path', { d: 'M2.6 11.2 8 13.9 13.6 11.2' }),
			);

		/** Retry a boundary once shortly after a failure: boot-time errors are often transient. */
		function retryLater(boundary, delayMs) {
			if (boundary.retried === true) return;
			boundary.retried = true;
			window.setTimeout(() => {
				if (boundary.mounted !== false) boundary.setState({ failed: false });
			}, delayMs);
		}

		/** Keep a broken label decoration from taking the whole seat down. */
		class LabelBoundary extends React.Component {
			state = { failed: false };
			componentDidMount() {
				this.mounted = true;
			}
			componentWillUnmount() {
				this.mounted = false;
			}
			static getDerivedStateFromError() {
				return { failed: true };
			}
			componentDidCatch(error) {
				console.error('reasoning-slider: model label decoration failed:', error);
				retryLater(this, 900);
			}
			render() {
				return this.state.failed ? this.props.fallback : this.props.children;
			}
		}

		/** Last-resort seat: keeps the composer model control mounted if the slider throws. */
		function FallbackSeat(props) {
			let label = props.t('trigger.fallback');
			try {
				const snapshot = props.getDirectory().store.getSnapshot();
				const current = snapshot.current;
				for (const group of snapshot.groups ?? []) {
					for (const model of group.models) {
						if (current !== null && current.provider === group.id && current.model === model.id) label = model.name;
					}
				}
			} catch (error) {
				console.error('reasoning-slider: fallback seat read failed:', error);
			}
			return h('span', { className: 'rsi_fallback', title: label }, label);
		}

		/** Contain a slider failure inside this seat instead of aborting the slot entry. */
		class SeatBoundary extends React.Component {
			state = { failed: false };
			componentDidMount() {
				this.mounted = true;
			}
			componentWillUnmount() {
				this.mounted = false;
			}
			static getDerivedStateFromError() {
				return { failed: true };
			}
			componentDidCatch(error) {
				console.error('reasoning-slider: seat render failed:', error);
				retryLater(this, 900);
			}
			render() {
				return this.state.failed ? this.props.fallback() : this.props.children;
			}
		}

		/**
		 * Registered seat: the slider proper, with a boundary so a render failure
		 * degrades to a static model label instead of handing the slot back.
		 * @param props - the slot entry props.
		 */
		function ModelSeat(props) {
			return h(SeatBoundary, { fallback: () => h(FallbackSeat, props) }, h(ModelSeatSlider, props));
		}

		/**
		 * Composer model seat with a snap-to-gear thinking-strength slider.
		 * @param props - owner share (locked) + injected model-directory face + locale seat + label access.
		 */
		function ModelSeatSlider(props) {
			const { locked, available, getDirectory, load, select, t, getLabelSeat, labelLocale } = props;
			/**
			 * Boot can render this seat before the session scope resolves its model
			 * directory. Resolve on every render, keep the last good store, and keep
			 * retrying while nothing resolves — never throw the entry away.
			 */
			const retries = useRef(0);
			const [retryTick, setRetryTick] = useState(0);
			const lastStore = useRef(undefined);
			let resolveError = null;
			try {
				const next = getDirectory().store;
				if (next !== undefined) lastStore.current = next;
			} catch (error) {
				resolveError = error?.message ?? String(error);
			}
			const store = lastStore.current ?? EMPTY_STORE;
			useEffect(() => {
				if (lastStore.current !== undefined) return undefined;
				if (retries.current >= 120) return undefined;
				const timer = window.setTimeout(() => {
					retries.current += 1;
					setRetryTick((value) => value + 1);
				}, 800);
				return () => window.clearTimeout(timer);
			}, [retryTick, store]);
			const subscribe = useMemo(() => (listener) => store.subscribe(listener), [store]);
			const snapshot = useMemo(() => () => store.getSnapshot(), [store]);
			const state = useSyncExternalStore(subscribe, snapshot, snapshot);

			/* Ask the directory to load as soon as it is resolvable: boot-time catalog
			 * loads can fail before the Host connection settles. */
			useEffect(() => {
				if (store === EMPTY_STORE) return;
				load();
			}, [store, load]);

			const [open, setOpen] = useState(false);
			const [pane, setPane] = useState('root');
			const [query, setQuery] = useState('');
			const [draft, setDraft] = useState(null);
			const [pending, setPending] = useState(null);
			const [selectError, setSelectError] = useState(null);
			const [pulse, setPulse] = useState(false);
			const [menuPos, setMenuPos] = useState(null);
			const [dragging, setDragging] = useState(false);

			const draftRef = useRef(null);
			const pendingRef = useRef(null);
			const commitSeq = useRef(0);
			const draggingRef = useRef(false);
			const rootRef = useRef(null);
			const triggerRef = useRef(null);
			const menuRef = useRef(null);
			const trackRef = useRef(null);
			const rangeRef = useRef(null);
			const searchRef = useRef(null);
			const id = useId();

			const menuId = `${id}-menu`;

			const groups = useMemo(
				() =>
					orderGroups(state.groups ?? []).map((group) => ({
						...group,
						provider: { id: group.id, name: group.id === 'deepseek-account' ? t('provider.account') : group.name },
					})),
				[state.groups, t],
			);
			const choices = useMemo(
				() => groups.flatMap((group) => group.models.map((model) => ({ group, model, selection: { provider: group.id, model: model.id } }))),
				[groups],
			);
			const current = state.current ?? null;
			const currentChoice =
				current === null
					? undefined
					: choices.find((choice) => choice.group.id === current.provider && choice.model.id === current.model);
			const reasoning = currentChoice?.model.reasoning;

			/** Adapter-advertised gears, with a fallback set for adapters without metadata. */
			const effortChoices = useMemo(() => {
				const efforts = reasoning?.efforts ?? [];
				if (efforts.length > 0) {
					const real = efforts.map((effort) => ({
						key: `effort:${effort.id}`,
						effort: effort.id,
						label: effort.name,
						...(effort.description === undefined ? {} : { description: effort.description }),
					}));
					if (reasoning.defaultEffort === undefined && real.length < 5) {
						return [{ key: 'provider-default', effort: undefined, label: t('effort.providerDefault') }, ...real];
					}
					return real;
				}
				if (current === null) return [];
				return FALLBACK_EFFORTS.map((effort) => ({ key: `fallback:${effort.id}`, effort: effort.id, label: effort.name }));
			}, [reasoning, current, t]);

			const effectiveEffort = current?.reasoningEffort ?? reasoning?.defaultEffort;
			const count = effortChoices.length;
			const centers = useMemo(() => {
				if (count === 0) return [];
				if (count === 1) return [0];
				return Array.from({ length: count }, (_, index) => (index * 100) / (count - 1));
			}, [count]);
			const effectiveIndex = count === 0 ? 0 : Math.max(0, effortChoices.findIndex((choice) => choice.effort === effectiveEffort));
			const commitIndex = count === 0 ? 0 : clamp(pending === null ? effectiveIndex : pending, 0, count - 1);
			const shownPct = draft !== null ? draft : (centers[commitIndex] ?? 0);
			/** Nearest gear for a continuous drag position, so labels and effects track the pointer. */
			const nearestGear = (percent) => {
				if (count === 0) return 0;
				let best = 0;
				let bestDistance = Infinity;
				for (let index = 0; index < count; index += 1) {
					const distance = Math.abs(percent - centers[index]);
					if (distance < bestDistance) {
						bestDistance = distance;
						best = index;
					}
				}
				return best;
			};
			const displayIndex = count === 0 ? 0 : draft === null ? commitIndex : nearestGear(draft);
			/** The highest gear lights the filled track with a flowing blue-purple current. */
			const maxed = count > 1 && displayIndex === count - 1;
			/**
	 * Measured track width: every layer is drawn in one SVG coordinate space, so
	 * rounded ends are geometry (rect rx) instead of inheritable CSS.
	 */
const [trackWidth, setTrackWidth] = useState(0);
useLayoutEffect(() => {
	const node = trackRef.current;
	if (node === null) return undefined;
	const measure = () => {
		const width = node.getBoundingClientRect().width;
		if (width > 0) setTrackWidth(width);
	};
	measure();
	if (typeof ResizeObserver === 'undefined') return undefined;
	const observer = new ResizeObserver(measure);
	observer.observe(node);
	return () => observer.disconnect();
}, [open]);
const gradientId = `${id.replace(/[:]/g, '')}-gear`;
const knobRadius = THUMB_SIZE / 2;
const usableWidth = Math.max(0, trackWidth - knobRadius * 2);
const shownClamped = clamp(shownPct, 0, 100);
const thumbX = knobRadius + (usableWidth * shownClamped) / 100;
/** The zero gear has no fill at all; any fill stops under the knob centre. */
const fillWidth = shownClamped <= 0 ? 0 : thumbX;
const dotX = (percent) => knobRadius + (usableWidth * percent) / 100;
const pctLeft = (x) => (trackWidth > 0 ? `${(x / trackWidth) * 100}%` : '0%');

			/** Sweep the gradient in from the left with a frame loop instead of CSS keyframes. */
			const [reveal, setReveal] = useState(1);
			useLayoutEffect(() => {
				if (!maxed) {
					setReveal(1);
					return undefined;
				}
				let raf = 0;
				const startedAt = performance.now();
				setReveal(0);
				const step = (now) => {
					const t = Math.min(1, (now - startedAt) / 750);
					setReveal(1 - Math.pow(1 - t, 3));
					if (t < 1) raf = window.requestAnimationFrame(step);
				};
				raf = window.requestAnimationFrame(step);
				return () => {
					if (raf !== 0) window.cancelAnimationFrame(raf);
				};
			}, [maxed]);
			const currentEffort = effortChoices[displayIndex];
			const shownEffortLabel = currentEffort?.label ?? (effectiveEffort ?? undefined);
			const modelText = currentChoice?.model.name ?? (state.status === 'loading' ? t('trigger.loading') : t('trigger.fallback'));
			const triggerTitle = shownEffortLabel === undefined ? modelText : `${modelText} · ${shownEffortLabel}`;
			const triggerAria =
				currentChoice === undefined
					? t('trigger.selectAria')
					: shownEffortLabel === undefined
						? t('trigger.aria', { model: modelText })
						: t('trigger.ariaEffort', { model: modelText, effort: shownEffortLabel });
			const busy = state.status === 'selecting' || state.pending != null;
			const showSearch = choices.length > 4;
			const currentKey = current === null ? '' : `${current.provider}/${current.model}`;

			const filteredGroups = useMemo(
				() =>
					groups
						.map((group) => ({ ...group, models: filterModels(group.models, showSearch ? query.trim() : '') }))
						.filter((group) => group.models.length > 0),
				[groups, query, showSearch],
			);

			/* ---------- model label decoration ---------- */

			const renderModelLabel = (provider, model, placement, selected) => {
				try {
					const seat = getLabelSeat();
					if (seat === undefined) return model.name;
					let chipT;
					if (seat.namespace !== undefined && labelLocale !== undefined) {
						try {
							chipT = labelLocale.bind(seat.namespace);
						} catch {
							chipT = undefined;
						}
					}
					const Decoration = seat.component;
					return h(
						LabelBoundary,
						{ fallback: model.name },
						h(Decoration, {
							provider,
							model,
							placement,
							selected,
							...(chipT === undefined ? {} : { t: chipT }),
						}),
					);
				} catch (error) {
					console.error('reasoning-slider: model label failed:', error);
					return model.name;
				}
			};

			/* ---------- placement ---------- */

			useLayoutEffect(() => {
				if (!open) {
					setMenuPos(null);
					return undefined;
				}
				const place = () => {
					const rect = triggerRef.current?.getBoundingClientRect();
					if (rect === undefined) return;
					const menu = menuRef.current;
					const width = menu?.offsetWidth ?? MENU_WIDTH;
					const height = menu?.offsetHeight ?? 0;
					const margin = 12;
					let left = rect.right - width;
					let top = rect.top - 8 - height;
					left = Math.min(Math.max(left, margin), window.innerWidth - width - margin);
					top = Math.min(Math.max(top, margin), window.innerHeight - height - margin);
					setMenuPos({ left, top });
				};
				place();
				window.addEventListener('scroll', place, true);
				window.addEventListener('resize', place);
				const menu = menuRef.current;
				const observer = typeof ResizeObserver !== 'undefined' && menu !== null ? new ResizeObserver(place) : null;
				if (menu !== null) observer?.observe(menu);
				return () => {
					observer?.disconnect();
					window.removeEventListener('scroll', place, true);
					window.removeEventListener('resize', place);
				};
			}, [open, pane, query]);

			useEffect(() => {
				if (!open) return undefined;
				const closeOutside = (event) => {
					if (rootRef.current?.contains(event.target) === true) return;
					if (menuRef.current?.contains(event.target) === true) return;
					setOpen(false);
					setPane('root');
				};
				document.addEventListener('mousedown', closeOutside);
				return () => document.removeEventListener('mousedown', closeOutside);
			}, [open]);

			useEffect(() => {
				if (!open || pane !== 'model') return undefined;
				const timer = window.setTimeout(() => {
					if (showSearch) searchRef.current?.focus();
				}, 0);
				return () => window.clearTimeout(timer);
			}, [open, pane, showSearch]);

			/** Host confirmed the pending gear: release the pending highlight. */
			useEffect(() => {
				if (pending === null) return;
				const choice = effortChoices[pending];
				if (choice === undefined || choice.effort !== effectiveEffort) return;
				pendingRef.current = null;
				setPending(null);
			}, [pending, effortChoices, effectiveEffort]);

			/* A different model carries its own default gear: drop the draft. */
			useEffect(() => {
				draftRef.current = null;
				setDraft(null);
				pendingRef.current = null;
				setPending(null);
			}, [currentKey]);

			/* ---------- actions ---------- */

			const describeFailure = (result) => {
				if (result === undefined || result === null || result.ok !== false) return null;
				const code = result.error?.code;
				if (code === 'session/writer-held') return t('error.sessionInUse');
				const message = result.error?.message ?? String(result.error ?? '');
				return t('error.action', { message: code === undefined ? message : `${code}: ${message}` });
			};

			const show = () => {
				triggerRef.current?.focus();
				if (store === EMPTY_STORE) {
					retries.current = 0;
					setRetryTick((value) => value + 1);
				}
				setPane('root');
				setQuery('');
				setSelectError(null);
				setDraft(null);
				setPulse(false);
				draftRef.current = null;
				setOpen(true);
				load();
			};

			const close = (restoreFocus) => {
				setOpen(false);
				setPane('root');
				setQuery('');
				setSelectError(null);
				setDraft(null);
				draftRef.current = null;
				pendingRef.current = null;
				setPending(null);
				setPulse(false);
				if (restoreFocus) Promise.resolve().then(() => triggerRef.current?.focus());
			};

			const pulseThumb = () => {
				setPulse(false);
				window.requestAnimationFrame(() => setPulse(true));
			};

			const commitAt = (index) => {
				const choice = effortChoices[index];
				if (choice === undefined || state.current === null) return;
				if (choice.effort === effectiveEffort && pendingRef.current === null) return;
				if (pendingRef.current === index) return;
				const seq = ++commitSeq.current;
				pendingRef.current = index;
				setPending(index);
				setSelectError(null);
				Promise.resolve(
					select({
						provider: state.current.provider,
						model: state.current.model,
						...(choice.effort === undefined ? {} : { reasoningEffort: choice.effort }),
					}),
				)
					.then((result) => {
						if (commitSeq.current !== seq) return;
						if (result !== undefined && result !== null && result.ok === false) {
							pendingRef.current = null;
							setPending(null);
							draftRef.current = null;
							setDraft(null);
							setSelectError(describeFailure(result) ?? t('error.action', { message: String(result.error?.message ?? '') }));
						}
					})
					.catch((reason) => {
						if (commitSeq.current !== seq) return;
						pendingRef.current = null;
						setPending(null);
						draftRef.current = null;
						setDraft(null);
						setSelectError(t('error.action', { message: reason?.message ?? String(reason) }));
					});
			};

			const commitDraft = () => {
				const percent = draftRef.current;
				if (percent === null || count === 0) return;
				let nearest = 0;
				let minDistance = Math.abs(percent - centers[0]);
				for (let index = 1; index < count; index += 1) {
					const distance = Math.abs(percent - centers[index]);
					if (distance < minDistance) {
						minDistance = distance;
						nearest = index;
					}
				}
				const center = centers[nearest];
				draftRef.current = center;
				setDraft(center);
				pulseThumb();
				commitAt(nearest);
			};

			const chooseModel = (group, model) => {
				if (busy) return;
				if (current !== null && current.provider === group.id && current.model === model.id) {
					close(true);
					return;
				}
				const selection = { provider: group.id, model: model.id };
				if (model.reasoning?.defaultEffort !== undefined) selection.reasoningEffort = model.reasoning.defaultEffort;
				setSelectError(null);
				Promise.resolve(select(selection))
					.then((result) => {
						if (result !== undefined && result !== null && result.ok === false) {
							setSelectError(describeFailure(result) ?? t('error.action', { message: String(result.error?.message ?? '') }));
							return;
						}
						close(true);
					})
					.catch((reason) => {
						setSelectError(t('error.action', { message: reason?.message ?? String(reason) }));
					});
			};

			/** Stream every native input event into the draft so the knob tracks the pointer. */
			const onRangeInput = (event) => {
				const value = Number(event.target.value);
				draftRef.current = value;
				setDraft(value);
				if (selectError !== null) setSelectError(null);
			};

			const onRangeKeyUp = (event) => {
				if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'Home' || event.key === 'End' || event.key === 'PageUp' || event.key === 'PageDown') {
					commitDraft();
				}
			};

			const onMenuKeyDown = (event) => {
				if (event.key !== 'Escape') return;
				event.preventDefault();
				event.stopPropagation();
				if (pane !== 'root' && currentChoice !== undefined) {
					setPane('root');
					Promise.resolve().then(() => triggerRef.current?.focus());
				} else {
					close(true);
				}
			};

			/* ---------- view ---------- */

			if (!available) return null;

			const trigger = h(
				'div',
				{ ref: rootRef, className: 'rsi_root' },
				h(
					'button',
					{
						ref: triggerRef,
						type: 'button',
						className: 'rsi_trigger',
						'aria-label': triggerAria,
						'aria-haspopup': 'dialog',
						'aria-expanded': open,
						'aria-controls': open ? menuId : undefined,
						'aria-busy': busy || undefined,
						title: triggerTitle,
						disabled: locked,
						onKeyDown: (event) => {
							if (event.key === 'Escape' && open) {
								event.preventDefault();
								close(true);
							}
						},
						onClick: () => {
							if (open) close(true);
							else show();
						},
					},
					h(ModelIcon, { className: 'rsi_triggerIcon' }),
					h(
						'span',
						{ className: 'rsi_triggerLabel' },
						currentChoice === undefined
							? modelText
							: renderModelLabel(currentChoice.group.provider, currentChoice.model, 'trigger', true),
					),
					shownEffortLabel !== undefined && h('span', { className: 'rsi_triggerEffort' }, shownEffortLabel),
					h('span', { className: open ? 'rsi_chevron rsi_chevronOpen' : 'rsi_chevron' }, h(ChevronDown, { size: 14 })),
				),
			);

			if (!open) return trigger;

			const paneError = selectError;

			const rootContent = [
				h(
					'button',
					{
						key: 'model-row',
						type: 'button',
						className: 'rsi_cell',
						'aria-haspopup': 'listbox',
						onClick: () => {
							setPane('model');
							setQuery('');
						},
					},
					h('span', { className: 'rsi_cellLabel' }, t('menu.model')),
					h(
						'span',
						{ className: 'rsi_cellValue' },
						currentChoice === undefined
							? modelText
							: renderModelLabel(currentChoice.group.provider, currentChoice.model, 'menu', true),
					),
					h('span', { className: 'rsi_cellChevron' }, h(ChevronRight, { size: 14 })),
				),
				effortChoices.length > 0 &&
					h(
						'div',
						{ key: 'effort-head', className: 'rsi_effortRow' },
						h('span', { className: 'rsi_effortLabel' }, t('menu.effort')),
						maxed && h('span', { className: 'rsi_effortHint' }, t('effort.quotaHint')),
						h('span', { className: 'rsi_effortValue' }, shownEffortLabel ?? ''),
					),
				effortChoices.length > 0 &&
							h(
						'div',
						{ key: 'slider', ref: trackRef, className: 'rsi_slider', style: { position: 'relative', height: 34, margin: '8px 8px 11px' } },
						trackWidth > 0 && h('svg', {
						width: trackWidth,
						height: 34,
						viewBox: `0 0 ${trackWidth} 34`,
						'aria-hidden': 'true',
						style: { position: 'absolute', left: 0, top: 0, display: 'block', pointerEvents: 'none', zIndex: 0 },
						},
						h('defs', null,
						h('linearGradient', { id: gradientId, x1: '0', y1: '0', x2: '1', y2: '0' },
						h('stop', { offset: '0%', stopColor: '#5686fe' }),
						h('stop', { offset: '55%', stopColor: '#7c5cff' }),
						h('stop', { offset: '100%', stopColor: '#b06bff' }),
						),
						),
						h('rect', { x: 0, y: 0, width: trackWidth, height: 34, rx: 17, ry: 17, style: { fill: 'var(--rsi-track, rgba(255,255,255,.14))' } }),
						fillWidth > 0.5 && h('rect', { x: 0, y: 0, width: fillWidth, height: 34, rx: 17, ry: 17, style: { fill: 'var(--rsi-accent, #5686fe)' } }),
						maxed && h('rect', { x: 0, y: 0, width: Math.min(fillWidth, Math.max(34, fillWidth * (0.18 + 0.82 * reveal))), height: 34, rx: 17, ry: 17, style: { fill: `url(#${gradientId})` } }),
						centers.map((center, index) => h('circle', { key: `dot-${index}`, cx: dotX(center), cy: 17, r: 3, style: { fill: index <= displayIndex ? '#ffffff' : 'rgba(128,128,128,.45)' } })),
						),
						maxed && trackWidth > 0 && h('div', { className: 'rsi_flow', style: { position: 'absolute', left: 0, top: 0, height: '100%', width: fillWidth, overflow: 'hidden', zIndex: 1, pointerEvents: 'none' } },
						FLOW_PARTICLES.map((particle, index) => h('span', { key: index, className: 'rsi_particle', style: { top: `${particle.top}%`, width: `${particle.size}px`, height: `${particle.size}px`, animationDelay: `${particle.delay}s`, animationDuration: `${particle.duration}s` } })),
						),
						h('input', {
						key: 'range',
						ref: rangeRef,
						type: 'range',
						className: 'rsi_range',
						style: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', margin: 0, padding: 0, opacity: 0, cursor: 'pointer', zIndex: 3, WebkitAppearance: 'none', appearance: 'none' },
						min: 0,
						max: 100,
						step: 1,
						value: Math.round(shownPct),
						disabled: locked,
						'aria-label': t('slider.aria', { effort: shownEffortLabel ?? '' }),
						'aria-valuetext': shownEffortLabel ?? '',
						onInput: onRangeInput,
						onChange: onRangeInput,
						onPointerDown: () => { draggingRef.current = true; setDragging(true); draftRef.current = draftRef.current ?? shownPct; },
						onPointerUp: (event) => { draggingRef.current = false; setDragging(false); onRangeInput(event); commitDraft(); },
						onPointerCancel: () => { draggingRef.current = false; setDragging(false); commitDraft(); },
						onKeyUp: onRangeKeyUp,
						onBlur: commitDraft,
						}),
						h('div', {
						key: 'thumb',
						className: pulse ? 'rsi_thumb rsi_thumbPulse' : 'rsi_thumb',
						style: { position: 'absolute', top: '50%', left: pctLeft(thumbX), width: THUMB_SIZE, height: THUMB_SIZE, transform: 'translate(-50%, -50%)', zIndex: 4, boxSizing: 'border-box', pointerEvents: 'none', transition: dragging ? 'none' : 'left .15s ease-out' },
						'aria-hidden': 'true',
						},
						h('svg', { width: THUMB_SIZE, height: THUMB_SIZE, viewBox: `0 0 ${THUMB_SIZE} ${THUMB_SIZE}`, 'aria-hidden': 'true', style: { display: 'block', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.28))' } },
						h('circle', { cx: THUMB_SIZE / 2, cy: THUMB_SIZE / 2, r: THUMB_SIZE / 2 - 0.5, fill: '#ffffff', stroke: '#ffffff', strokeWidth: 1 }),
						),
						),
						),
				paneError !== null && h('div', { key: 'error', className: 'rsi_error', role: 'alert' }, paneError),
				resolveError !== null &&
					h(
						'div',
						{ key: 'resolve-error', className: 'rsi_error', role: 'alert' },
						t('error.directory', { message: resolveError }),
					),
				state.status === 'error' &&
					state.error !== null &&
					h(
						'div',
						{ key: 'directory-error', className: 'rsi_error', role: 'alert' },
						t('error.action', { message: state.error }),
					),
			];

			const modelContent = h(
				'div',
				{ className: 'rsi_modelPane' },
				h(
					'div',
					{ className: 'rsi_paneHead', style: { padding: '2px 4px 4px' } },
					h(
						'button',
						{
							type: 'button',
							className: 'rsi_back',
							'aria-label': t('back.label'),
							onClick: () => {
								setPane('root');
								setQuery('');
								Promise.resolve().then(() => triggerRef.current?.focus());
							},
						},
						h(ChevronLeft, { size: 14 }),
					),
					h('span', null, t('menu.model')),
				),
				showSearch &&
					h(
						'div',
						{ className: 'rsi_searchRow' },
						h('input', {
							ref: searchRef,
							className: 'rsi_search',
							type: 'text',
							role: 'searchbox',
							placeholder: t('search.placeholder'),
							'aria-label': t('search.placeholder'),
							value: query,
							disabled: busy,
							spellCheck: false,
							onChange: (event) => setQuery(event.target.value),
						}),
						query !== '' &&
							h(
								'button',
								{
									type: 'button',
									className: 'rsi_searchClear',
									'aria-label': t('search.clear'),
									onClick: () => {
										setQuery('');
										searchRef.current?.focus();
									},
								},
								h(CloseIcon, { size: 12 }),
							),
					),
				state.status === 'loading' && h('div', { className: 'rsi_status', role: 'status' }, t('status.loading')),
				state.error !== null &&
					h('div', { className: 'rsi_error', role: 'alert' }, t('error.action', { message: state.error })),
				(state.failures ?? []).map((failure) =>
					h(
						'div',
						{ key: `failure-${failure.id}`, className: 'rsi_warning', role: 'status' },
						t('warning.groupLoad', {
							name: failure.id === 'deepseek-account' ? t('provider.account') : failure.name,
							message: failure.message,
						}),
					),
				),
				h(
					'div',
					{ className: 'rsi_groups scrollable', role: 'listbox', 'aria-label': t('menu.model') },
					filteredGroups.map((group) =>
						h(
							'section',
							{ key: group.id, className: 'rsi_group', role: 'group', 'aria-label': group.provider.name },
							h(
								'div',
								{ className: 'rsi_groupTitle' },
								group.id === 'deepseek-account' ? t('provider.account') : group.name,
							),
							group.models.map((model) => {
								const selected = current !== null && current.provider === group.id && current.model === model.id;
								return h(
									'button',
									{
										key: model.id,
										type: 'button',
										className: 'rsi_option',
										role: 'option',
										'aria-selected': selected,
										title: model.name,
										disabled: busy,
										onClick: () => chooseModel(group, model),
									},
									h(
										'span',
										{ className: 'rsi_optionCopy' },
										h(
											'span',
											{ className: 'rsi_modelName' },
											renderModelLabel(group.provider, model, 'option', selected),
										),
										model.description !== undefined && h('span', { className: 'rsi_modelDesc' }, model.description),
									),
									h('span', { className: 'rsi_check' }, selected ? h(Check, { size: 16 }) : null),
								);
							}),
						),
					),
				),
				state.status === 'ready' &&
					filteredGroups.length === 0 &&
					h('div', { className: 'rsi_status', role: 'status' }, t(choices.length === 0 ? 'empty.models' : 'search.empty')),
			);

			const menu = ReactDOM.createPortal(
				h(
					'div',
					{
						ref: menuRef,
						id: menuId,
						className: 'rsi_menu',
						style: menuPos ?? MEASURE_STYLE,
						role: 'dialog',
						'aria-label': t('menu.aria'),
						onKeyDown: onMenuKeyDown,
						onMouseDown: (event) => {
							if (event.target instanceof Element && event.target.closest('button') !== null) event.preventDefault();
						},
					},
					pane === 'root' ? rootContent : modelContent,
				),
				document.body,
			);

			return h(React.Fragment, null, trigger, menu);
		}

		/**
		 * Required Client services: seat registry, locale, session identity, the
		 * remote session namespace the model directory resolves against, and the
		 * directory itself. Waiting on `remote.session` keeps boot-time registration
		 * from touching it before Cordis has provided it.
		 */
		const inject = ['slots', 'locale', 'sessions', 'remote', 'remote.session', 'modelDirectories'];

		/** Immutable empty directory used when the session directory cannot be resolved. */
		const EMPTY_STATE = { current: null, groups: [], failures: [], status: 'ready', pending: null, error: null };
		const EMPTY_STORE = { getSnapshot: () => EMPTY_STATE, subscribe: () => () => {} };

		/**
		 * Client plugin body: styles + dictionaries, then a shaded registration of
		 * the composer's model seat over the shipped model directory.
		 * @param ctx - Client root context.
		 */
		function apply(ctx) {
			ctx.effect(() => {
				const tagId = `${PKG}/ThinkingSlider.css`;
				/* Always replace our own stylesheet: a stale tag from an earlier
				 * generation must never keep old geometry alive. */
				for (const stale of document.querySelectorAll(`style[data-plugin="${PKG}"]`)) stale.remove();
				const tag = document.createElement('style');
				tag.dataset.plugin = PKG;
				tag.dataset.pluginCss = tagId;
				tag.textContent = CSS;
				document.head.appendChild(tag);
				return () => tag.remove();
			}, 'reasoning-slider: styles');

			ctx.effect(
				() =>
					ctx.locale.register(NS, {
						zh,
						en,
					}),
				'reasoning-slider: dictionaries',
			);

			ctx.inject(['slots', 'locale', 'sessions', 'remote', 'remote.session', 'modelDirectories'], (scope) => {
				const slots = scope.slots;
				const models = scope.modelDirectories;
				const sessions = scope.sessions;
				const locale = scope.locale;
				scope.effect(
					() =>
						slots.inject('conversation.input.model', () =>
							slots.register(
								{
									name: 'conversation.input.model',
									priority: -1,
									locale: NS,
									inject: (sessionId) => {
										let available = true;
										try {
											available = sessions.subagentAddress(sessionId) === undefined;
										} catch (error) {
											console.error('reasoning-slider: session availability failed:', error);
										}
										const getDirectory = () => models.directoryFor(sessionId);
										return {
											available,
											getDirectory,
											load: () => {
												if (!available) return;
												try {
													getDirectory().load().catch(() => {});
												} catch (error) {
													console.error('reasoning-slider: directory load failed:', error);
												}
											},
											select: (selection) => {
												if (!available) return Promise.resolve(undefined);
												try {
													return getDirectory().select(selection);
												} catch (error) {
													console.error('reasoning-slider: directory select failed:', error);
													return Promise.resolve(undefined);
												}
											},
											/** The seat's label seat is declared by the shipped entry; render its winner here. */
											getLabelSeat: () => {
												try {
													for (const entry of slots.entries('conversation.input.model.label')) {
														if (typeof entry.component === 'function') {
															return { component: entry.component, namespace: entry.locale };
														}
													}
												} catch (error) {
													console.error('reasoning-slider: label seat lookup failed:', error);
												}
												return undefined;
											},
											labelLocale: locale,
										};
									},
								},
								ModelSeat,
							),
						),
					'reasoning-slider: model seat',
				);
			});
		}

		return { inject, apply };
	},
});
