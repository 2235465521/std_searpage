import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  status: 'abolished' | 'current' | 'history';
}

interface Link extends d3.SimulationLinkDatum<Node> {
  type: 'direct' | 'indirect';
}

const data: { nodes: Node[]; links: Link[] } = {
  nodes: [
    { id: 'GB/T 26557-2021', label: 'GB/T 26557-2021', status: 'current' },
    { id: 'GB/T 26557-2011', label: 'GB/T 26557-2011', status: 'current' },
    { id: 'GB 1000.1-1988', label: 'GB 1000.1-1988', status: 'abolished' },
    { id: 'GB 1000-1981', label: 'GB 1000-1981', status: 'history' },
    { id: 'GB 10055-2007', label: 'GB 10055-2007', status: 'current' },
    { id: 'GB 10055-1996', label: 'GB 10055-1996', status: 'abolished' },
  ],
  links: [
    { source: 'GB/T 26557-2021', target: 'GB/T 26557-2011', type: 'direct' },
    { source: 'GB/T 26557-2011', target: 'GB 1000.1-1988', type: 'direct' },
    { source: 'GB 1000.1-1988', target: 'GB 1000-1981', type: 'indirect' },
    { source: 'GB/T 26557-2011', target: 'GB 10055-2007', type: 'direct' },
    { source: 'GB 10055-2007', target: 'GB 10055-1996', type: 'direct' },
  ],
};

export default function EvolutionGraph() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 800;
    const height = 400;

    const svg = d3.select(svgRef.current)
      .attr('viewBox', [0, 0, width, height])
      .attr('width', '100%')
      .attr('height', '100%');

    svg.selectAll('*').remove();

    // Define fixed positions to match the image layout
    const positions: Record<string, [number, number]> = {
      'GB/T 26557-2021': [400, 50],
      'GB/T 26557-2011': [400, 150],
      'GB 1000.1-1988': [300, 250],
      'GB 1000-1981': [300, 350],
      'GB 10055-2007': [500, 240],
      'GB 10055-1996': [500, 340],
    };

    data.nodes.forEach(n => {
      n.x = positions[n.id][0];
      n.y = positions[n.id][1];
    });

    const links = svg.append('g')
      .selectAll('line')
      .data(data.links)
      .enter()
      .append('line')
      .attr('stroke', (d: any) => {
        const targetId = typeof d.target === 'string' ? d.target : d.target.id;
        const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
        if (sourceId === 'GB/T 26557-2011' && targetId === 'GB 1000.1-1988') return '#1d4ed8'; // Blue line
        return '#e2e8f0';
      })
      .attr('stroke-width', (d: any) => {
          const targetId = typeof d.target === 'string' ? d.target : d.target.id;
          const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
          if (sourceId === 'GB/T 26557-2011' && targetId === 'GB 1000.1-1988') return 3;
          return 1.5;
      })
      .attr('stroke-dasharray', (d: any) => d.type === 'indirect' ? '4,4' : '0')
      .attr('x1', (d: any) => positions[typeof d.source === 'string' ? d.source : d.source.id][0])
      .attr('y1', (d: any) => positions[typeof d.source === 'string' ? d.source : d.source.id][1])
      .attr('x2', (d: any) => positions[typeof d.target === 'string' ? d.target : d.target.id][0])
      .attr('y2', (d: any) => positions[typeof d.target === 'string' ? d.target : d.target.id][1]);

    const nodeGroup = svg.append('g')
      .selectAll('g')
      .data(data.nodes)
      .enter()
      .append('g')
      .attr('transform', d => `translate(${d.x},${d.y})`);

    nodeGroup.append('circle')
      .attr('r', 18)
      .attr('fill', d => {
        if (d.status === 'abolished') return '#b91c1c';
        if (d.status === 'current') return '#e2e8f0';
        return 'white';
      })
      .attr('stroke', d => d.status === 'history' ? '#cbd5e1' : 'none')
      .attr('stroke-width', 2);

    // Add shadow to the specific red node if it's the main one
    nodeGroup.filter(d => d.id === 'GB 1000.1-1988')
      .select('circle')
      .attr('filter', 'drop-shadow(0 0 8px rgba(185, 28, 28, 0.5))');

    nodeGroup.append('text')
      .attr('dy', (d, i) => i === 2 ? -30 : -25) // Offset text
      .attr('text-anchor', 'middle')
      .attr('fill', d => d.id === 'GB 1000.1-1988' ? '#1d4ed8' : '#64748b')
      .attr('font-size', '10px')
      .attr('font-weight', d => d.id === 'GB 1000.1-1988' ? '600' : '400')
      .text(d => d.label);
      
    // Legend group
    const legend = svg.append('g')
      .attr('transform', `translate(${width - 150}, ${height - 120})`);
      
    legend.append('rect')
      .attr('width', 130)
      .attr('height', 100)
      .attr('fill', 'white')
      .attr('rx', 8)
      .attr('filter', 'drop-shadow(0 4px 6px rgba(0,0,0,0.05))');
      
    legend.append('text')
      .attr('x', 10)
      .attr('y', 20)
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .text('图例说明');
      
    const legendItems = [
      { color: '#b91c1c', label: '当前标准 (已废止)' },
      { color: '#e2e8f0', label: '现行标准' },
      { color: 'white', label: '历史标准', stroke: '#cbd5e1' },
    ];
    
    legendItems.forEach((item, i) => {
      const g = legend.append('g').attr('transform', `translate(10, ${45 + i * 20})`);
      g.append('circle')
        .attr('r', 5)
        .attr('fill', item.color)
        .attr('stroke', item.stroke || 'none');
      g.append('text')
        .attr('x', 15)
        .attr('y', 4)
        .attr('font-size', '10px')
        .attr('fill', '#64748b')
        .text(item.label);
    });

  }, []);

  return (
    <div className="w-full h-[450px] bg-white rounded-xl flex items-center justify-center overflow-hidden">
      <svg ref={svgRef}></svg>
    </div>
  );
}
