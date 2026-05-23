import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Popover, message } from 'antd';
import { Info, Crosshair } from 'lucide-react';
import * as d3 from 'd3';
import EmptyState from '../ui/EmptyState';

function GraphLegendContent() {
  const nodeItems = [
    {
      key: 'current',
      symbol: (
        <span className="relative flex h-3.5 w-3.5 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-red-500/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-red-200" />
        </span>
      ),
      label: '当前标准（红）',
    },
    {
      key: 'open',
      symbol: <span className="h-3.5 w-3.5 rounded-full border-2 border-slate-300 bg-slate-100" />,
      label: '可点击打开详情',
    },
    {
      key: 'missing',
      symbol: <span className="h-3.5 w-3.5 rounded-full border-2 border-dashed border-slate-400 bg-white" />,
      label: '未收录（灰虚线）',
    },
  ];

  const lineItems = [
    { color: '#1d4ed8', label: '完全代替' },
    { color: '#dc2626', label: '部分代替' },
    { color: '#16a34a', label: '部分代完' },
    { color: '#94a3b8', label: '未知' },
  ];

  return (
    <div className="w-[168px] space-y-2.5">
      <section>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">节点</p>
        <ul className="space-y-1.5">
          {nodeItems.map((item) => (
            <li key={item.key} className="flex items-center gap-2">
              {item.symbol}
              <span className="text-xs font-medium text-slate-700">{item.label}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
          悬停显示标准号；高亮相邻节点
        </p>
      </section>
      <div className="h-px bg-slate-100" />
      <section>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">连线</p>
        <ul className="space-y-1.5">
          {lineItems.map((item) => (
            <li key={item.label} className="flex items-center gap-2">
              <span
                className="h-0.5 w-5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs font-medium text-slate-700">{item.label}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default function EvolutionGraph({ chainData, currentStdId, returnPath, parentNavState, embedded = false }) {
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const graphApiRef = useRef({ resetView: null });
  const [hintMeta, setHintMeta] = useState(null);
  const [hoverOverlay, setHoverOverlay] = useState(null);
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  const returnPathRef = useRef(returnPath);
  const parentNavStateRef = useRef(parentNavState);

  navigateRef.current = navigate;
  returnPathRef.current = returnPath;
  parentNavStateRef.current = parentNavState;

  const nodeCount = chainData?.nodes?.length ?? 0;
  const hasGraph = nodeCount > 0;

  const handleResetView = useCallback(() => {
    graphApiRef.current.resetView?.();
  }, []);

  useEffect(() => {
    setHintMeta(null);
    setHoverOverlay(null);
  }, [currentStdId, chainData]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const svgEl = svgRef.current;
    if (!wrap || !svgEl || !hasGraph) return;

    let cancelled = false;

    const draw = () => {
      if (cancelled) return;
      const rect = wrap.getBoundingClientRect();
      const width = Math.max(Math.floor(rect.width), 320);
      const height = Math.max(Math.floor(rect.height), 400);
      if (width < 50 || height < 50) return;

      const margin = { top: 56, right: 40, bottom: 72, left: 40 };

      const svg = d3.select(svgEl)
        .attr('viewBox', [0, 0, width, height])
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('preserveAspectRatio', 'xMidYMid meet');

      svg.selectAll('*').remove();

      svg.append('style').text(`
        @keyframes pulse {
          0% { stroke-width: 4; stroke-opacity: 0.6; r: 18; }
          50% { stroke-width: 15; stroke-opacity: 0.2; r: 20; }
          100% { stroke-width: 4; stroke-opacity: 0.6; r: 18; }
        }
        .current-node-pulse {
          animation: pulse 2s infinite ease-in-out;
        }
      `);

      const container = svg.append('g');

      const ZOOM_MIN = 0.75;
      const ZOOM_MAX = 1.35;

      const zoom = d3.zoom()
        .scaleExtent([ZOOM_MIN, ZOOM_MAX])
        .translateExtent([
          [-width * 0.4, -height * 0.4],
          [width * 1.4, height * 1.4],
        ])
        .wheelDelta((event) => {
          const base = event.deltaMode === 1 ? 0.04 : event.deltaMode ? 0.8 : 0.0006;
          const delta = -event.deltaY * base;
          return Math.max(-0.06, Math.min(0.06, delta));
        })
        .filter((event) => {
          if (event.type === 'wheel') return true;
          let el = event.target;
          while (el) {
            if (el.classList?.contains('evolution-node')) return false;
            el = el.parentNode;
          }
          return !event.ctrlKey && event.button === 0;
        })
        .on('zoom', (event) => {
          container.attr('transform', event.transform);
        });

      svg.call(zoom);
      svg.on('dblclick.zoom', null);

      const resolvableMap = chainData.resolvable || {};
      const hasResolvableMap = Object.keys(resolvableMap).length > 0;
      const canOpenDetail = (nodeId) => (
        hasResolvableMap ? resolvableMap[nodeId] === true : true
      );

      const edgeMetaKey = (source, target) => `${source}|${target}`;
      const defaultEdgeMeta = { replace_label: '未知', replace_color: '#94a3b8' };

      const nodesData = chainData.nodes.map((d) => ({ id: d, label: d }));
      const linksData = (chainData.edges || [])
        .filter((d) => d?.source && d?.target)
        .map((d) => ({
          source: d.source,
          target: d.target,
          replace_label: d.replace_label || defaultEdgeMeta.replace_label,
          replace_color: d.replace_color || defaultEdgeMeta.replace_color,
        }));
      const edgeMetaMap = new Map(
        linksData.map((l) => [edgeMetaKey(l.source, l.target), l]),
      );

      const nodeMap = new Map(nodesData.map((n) => [n.id, n]));
      const childrenMap = new Map();
      const parentMap = new Map();
      nodesData.forEach((n) => childrenMap.set(n.id, []));

      linksData.forEach((l) => {
        if (!childrenMap.has(l.source)) return;
        childrenMap.get(l.source).push(l.target);
        parentMap.set(l.target, l.source);
      });

      const getFocusSet = (nodeId) => {
        if (!nodeId) return new Set();
        const set = new Set([nodeId]);
        const parent = parentMap.get(nodeId);
        if (parent) set.add(parent);
        (childrenMap.get(nodeId) || []).forEach((c) => set.add(c));
        return set;
      };

      const roots = nodesData.filter((n) => !parentMap.has(n.id));
      const isWideTree = nodeCount > 5;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      const treeLayout = d3.tree().size([innerW, innerH]);
      treeLayout.separation((a, b) => {
        const spread = isWideTree ? 1.35 : nodeCount > 3 ? 1.1 : 1;
        return (a.parent === b.parent ? 1 : 1.2) * spread;
      });

      function buildHierarchy(nodeId) {
        const node = nodeMap.get(nodeId);
        const children = childrenMap.get(nodeId) || [];
        return {
          ...node,
          children: children.map((childId) => buildHierarchy(childId)),
        };
      }

      const forest = roots.map((root) => buildHierarchy(root.id));
      let rootHierarchy;
      if (forest.length === 1) {
        rootHierarchy = d3.hierarchy(forest[0]);
      } else {
        rootHierarchy = d3.hierarchy({ id: 'virtual-root', children: forest });
      }

      treeLayout(rootHierarchy);

      const treeNodes = rootHierarchy.descendants().filter((d) => d.data.id !== 'virtual-root');
      const treeLinks = rootHierarchy.links().filter((d) => d.source.data.id !== 'virtual-root');

      treeNodes.forEach((d) => {
        d.x += margin.left;
        d.y += margin.top;
      });

      const getEdgeMeta = (link) => (
        edgeMetaMap.get(edgeMetaKey(link.source.data.id, link.target.data.id)) || defaultEdgeMeta
      );

      const lineGenerator = d3.linkVertical()
        .x((d) => d.x)
        .y((d) => d.y);

      let hoveredId = null;

      const applyFocus = (focusId) => {
        const focusSet = focusId ? getFocusSet(focusId) : new Set();
        const dim = focusId != null;

        linkGroup.selectAll('path')
          .attr('stroke-opacity', (d) => {
            if (!dim) return 0.9;
            const s = d.source.data.id;
            const t = d.target.data.id;
            return focusSet.has(s) && focusSet.has(t) ? 0.95 : 0.12;
          });

        nodeGroups.selectAll('.node-visual')
          .attr('opacity', (d) => {
            if (!dim) return canOpenDetail(d.data.id) ? 1 : 0.65;
            return focusSet.has(d.data.id) ? 1 : 0.2;
          });

        nodeGroups.selectAll('.node-label')
          .attr('opacity', (d) => {
            if (!dim) return 1;
            return focusSet.has(d.data.id) ? 1 : 0.25;
          });
      };

      const escapeHtml = (value) => (
        String(value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
      );

      const getParentReplaceText = (nodeId) => {
        const parentId = parentMap.get(nodeId);
        if (!parentId) return '';
        const edgeMeta = edgeMetaMap.get(edgeMetaKey(parentId, nodeId)) || defaultEdgeMeta;
        const replaceLabel = edgeMeta.replace_label;
        if (replaceLabel && replaceLabel !== '未知') {
          return `${replaceLabel} · 替代 ${parentId}`;
        }
        return `替代 ${parentId}`;
      };

      const buildHoverOverlay = (d) => {
        const wrap = wrapRef.current;
        if (!wrap || !svgEl) return null;
        const id = d.data.id;
        const openable = canOpenDetail(id);
        const point = svgEl.createSVGPoint();
        point.x = d.x;
        point.y = d.y;
        const screenCTM = container.node()?.getScreenCTM();
        if (!screenCTM) return null;
        const pt = point.matrixTransform(screenCTM);
        const wrapRect = wrap.getBoundingClientRect();
        const r = id === currentStdId ? 18 : 16;
        return {
          left: pt.x - wrapRect.left,
          top: pt.y - wrapRect.top - r - 16,
          label: d.data.label || '',
          sub: id === currentStdId
            ? '当前标准'
            : openable
              ? '点击查看详情'
              : '未收录，不可点击',
          extra: getParentReplaceText(id),
        };
      };

      const linkGroup = container.append('g').attr('class', 'evolution-links');

      linkGroup
        .selectAll('path')
        .data(treeLinks)
        .enter()
        .append('path')
        .attr('class', 'evolution-link')
        .attr('d', (d) => lineGenerator({ source: d.source, target: d.target }))
        .attr('fill', 'none')
        .attr('stroke', (d) => getEdgeMeta(d).replace_color)
        .attr('stroke-width', (d) => {
          const touchesCurrent = d.source.data.id === currentStdId || d.target.data.id === currentStdId;
          return touchesCurrent ? 3 : 2;
        })
        .attr('stroke-opacity', 0.9);

      const nodeGroups = container.append('g')
        .selectAll('g')
        .data(treeNodes)
        .enter()
        .append('g')
        .attr('class', 'evolution-node')
        .attr('transform', (d) => `translate(${d.x},${d.y})`)
        .style('cursor', (d) => (canOpenDetail(d.data.id) ? 'pointer' : 'not-allowed'))
        .on('click', (event, d) => {
          event.stopPropagation();
          const stdId = d.data?.id;
          if (!stdId) return;
          if (!canOpenDetail(stdId)) {
            message.warning('该演进节点对应的标准尚未收录，无法打开详情');
            return;
          }
          navigateRef.current(`/detail/${encodeURIComponent(stdId)}`, {
            state: returnPathRef.current
              ? { from: returnPathRef.current, prevState: parentNavStateRef.current ?? undefined }
              : undefined,
          });
        })
        .on('mouseenter', (event, d) => {
          hoveredId = d.data.id;
          setHintMeta({
            label: d.data.label,
            openable: canOpenDetail(d.data.id),
            isCurrent: d.data.id === currentStdId,
          });
          applyFocus(hoveredId);
          const baseR = d.data.id === currentStdId ? 18 : 16;
          d3.select(event.currentTarget).select('.node-visual').attr('r', baseR + 3);
          setHoverOverlay(buildHoverOverlay(d));
        })
        .on('mouseleave', (event, d) => {
          hoveredId = null;
          setHintMeta(null);
          setHoverOverlay(null);
          applyFocus(null);
          const baseR = d.data?.id === currentStdId ? 18 : 16;
          d3.select(event.currentTarget).select('.node-visual').attr('r', baseR);
        });

      nodeGroups
        .append('circle')
        .attr('class', 'node-hit-area')
        .attr('r', 26)
        .attr('fill', 'transparent');

      nodeGroups
        .filter((d) => d.data.id === currentStdId)
        .append('circle')
        .attr('r', 18)
        .attr('fill', 'none')
        .attr('stroke', '#b91c1c')
        .attr('class', 'current-node-pulse');

      nodeGroups
        .append('circle')
        .attr('class', 'node-visual')
        .attr('r', (d) => (d.data.id === currentStdId ? 18 : 16))
        .attr('fill', (d) => {
          if (d.data.id === currentStdId) return '#b91c1c';
          if (!canOpenDetail(d.data.id)) return '#f8fafc';
          return '#f1f5f9';
        })
        .attr('stroke', (d) => {
          if (d.data.id === currentStdId) return '#b91c1c';
          if (!canOpenDetail(d.data.id)) return '#94a3b8';
          return '#cbd5e1';
        })
        .attr('stroke-dasharray', (d) => (canOpenDetail(d.data.id) ? null : '4 3'))
        .attr('stroke-width', (d) => (d.data.id === currentStdId ? 0 : 2))
        .attr('opacity', (d) => (canOpenDetail(d.data.id) ? 1 : 0.65));

      nodeGroups
        .append('foreignObject')
        .attr('class', 'node-label')
        .attr('x', -78)
        .attr('y', 22)
        .attr('width', 156)
        .attr('height', 64)
        .attr('pointer-events', 'none')
        .append('xhtml:div')
        .style('font-family', 'system-ui, -apple-system, sans-serif')
        .style('text-align', 'center')
        .style('line-height', '1.35')
        .html((d) => {
          const id = d.data.id;
          const isCurrent = id === currentStdId;
          let html = `<div style="font-size:13px;font-weight:700;color:#1e293b;">${escapeHtml(id)}</div>`;
          if (isCurrent) {
            html += '<div style="font-size:12px;font-weight:600;color:#dc2626;margin-top:3px;">当前标准</div>';
          }
          return html;
        });

      const currentNode = treeNodes.find((d) => d.data.id === currentStdId);
      const centerOnCurrent = () => {
        if (!currentNode) {
          svg.call(zoom.transform, d3.zoomIdentity);
          return;
        }
        const scale = 1;
        const tx = width / 2 - currentNode.x * scale;
        const ty = height / 2 - currentNode.y * scale;
        const t = d3.zoomIdentity.translate(tx, ty).scale(scale);
        svg.transition().duration(400).call(zoom.transform, t);
      };

      graphApiRef.current.resetView = centerOnCurrent;
      centerOnCurrent();
    };

    draw();

    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => draw())
      : null;
    ro?.observe(wrap);

    return () => {
      cancelled = true;
      graphApiRef.current.resetView = null;
      ro?.disconnect();
    };
  }, [chainData, currentStdId, returnPath, parentNavState, hasGraph]);

  return (
    <div
      className={[
        'relative h-[550px] w-full overflow-hidden bg-gradient-to-b from-slate-50/40 to-white',
        embedded
          ? 'rounded-xl border border-slate-100'
          : 'rounded-[32px] border border-slate-100',
      ].join(' ')}
    >
      <div ref={wrapRef} className="relative h-full w-full">
        {!hasGraph && (
          <EmptyState
            icon="account_tree"
            title="暂无谱系数据"
            description="该标准暂无完整演进链，可查看上方替代关系或相关标准详情"
          />
        )}
        <svg
          ref={svgRef}
          className={`h-full w-full ${hasGraph ? 'cursor-grab active:cursor-grabbing' : 'hidden'}`}
        />

        {hoverOverlay && (
          <div
            className="pointer-events-none absolute z-30 max-w-[min(320px,85vw)] -translate-x-1/2 -translate-y-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center shadow-lg"
            style={{ left: hoverOverlay.left, top: hoverOverlay.top }}
          >
            <p className="text-sm font-bold leading-snug text-slate-800">{hoverOverlay.label}</p>
            <p className="mt-1 text-xs font-medium text-slate-600">{hoverOverlay.sub}</p>
            {hoverOverlay.extra ? (
              <p className="mt-1 text-xs leading-snug text-slate-500">{hoverOverlay.extra}</p>
            ) : null}
          </div>
        )}

        {hasGraph && (
          <>
            <div className="pointer-events-none absolute top-4 left-4 z-10 max-w-[min(320px,55%)] rounded-xl border border-red-100 bg-white/95 px-3 py-2 shadow-md backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-red-500/90">当前标准</p>
              <p className="truncate text-sm font-bold text-slate-800" title={currentStdId}>
                {currentStdId}
              </p>
            </div>

            <div className="absolute bottom-4 left-4 z-10 max-w-[min(360px,70%)] rounded-lg border border-slate-100 bg-white/90 px-3 py-2 text-xs text-slate-500 shadow-sm backdrop-blur-sm">
              {hintMeta ? (
                <span>
                  <span className="font-semibold text-slate-700">{hintMeta.label}</span>
                  <span className="text-slate-400">
                    {hintMeta.isCurrent
                      ? ' · 当前标准'
                      : hintMeta.openable
                        ? ' · 点击查看详情'
                        : ' · 未收录'}
                  </span>
                </span>
              ) : (
                <span>悬停节点查看标准号 · 实线圆点可点击</span>
              )}
            </div>

            <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleResetView}
                  className="flex items-center gap-1 rounded-lg border border-slate-200/90 bg-white/95 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm backdrop-blur-sm transition-all hover:border-blue-300 hover:bg-blue-50/90 hover:text-blue-600"
                  title="将视图居中到当前标准"
                >
                  <Crosshair size={14} />
                  居中
                </button>
                <Popover
                  title={<span className="text-xs font-bold text-slate-700">图例</span>}
                  content={<GraphLegendContent />}
                  trigger={['hover', 'click']}
                  placement="leftTop"
                  mouseEnterDelay={0.12}
                  mouseLeaveDelay={0.15}
                  arrow={false}
                  overlayInnerStyle={{ padding: '10px 12px' }}
                >
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-lg border border-slate-200/90 bg-white/95 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm backdrop-blur-sm transition-all hover:border-blue-300 hover:bg-blue-50/90 hover:text-blue-600"
                  >
                    <Info size={14} />
                    图例
                  </button>
                </Popover>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
