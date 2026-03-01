import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Search } from 'lucide-react';
import { Concept, Edge } from '../utils/nlp';

interface GraphProps {
  concepts: Concept[];
  edges: Edge[];
  onNodeClick: (concept: Concept) => void;
}

interface GraphNode extends d3.SimulationNodeDatum, Concept {}
interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  similarity: number;
}

export const KnowledgeGraph: React.FC<GraphProps> = ({ concepts, edges, onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || concepts.length === 0) return;

    const updateGraph = () => {
      if (!svgRef.current || !containerRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      // Background for better panning
      svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', 'transparent')
        .style('pointer-events', 'all');

      const nodes: GraphNode[] = concepts.map(c => ({ ...c }));
      const links: GraphLink[] = edges.map(e => ({
        source: e.source,
        target: e.target,
        similarity: e.similarity
      }));

      const simulation = d3.forceSimulation<GraphNode>(nodes)
        .force('link', d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(180))
        .force('charge', d3.forceManyBody().strength(-800))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide<GraphNode>().radius(d => 60 + (d.css * 30)));

      const g = svg.append('g');

      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 8])
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
        });

      svg.call(zoom);

      const link = g.append('g')
        .selectAll('line')
        .data(links)
        .enter().append('line')
        .attr('stroke', '#141414')
        .attr('stroke-opacity', 0.2)
        .attr('stroke-width', d => d.similarity * 5);

      const node = g.append('g')
        .selectAll('g')
        .data(nodes)
        .enter().append('g')
        .attr('cursor', 'pointer')
        .on('click', (event, d) => onNodeClick(d))
        .call(d3.drag<any, any>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended));

      node.append('circle')
        .attr('r', d => 40 + (d.css * 30))
        .attr('fill', d => {
          if (d.category === 'Strong') return '#E2F0D9';
          if (d.category === 'Moderate') return '#FFF2CC';
          return '#F8CBAD';
        })
        .attr('stroke', d => {
          if (d.category === 'Strong') return '#A9D18E';
          if (d.category === 'Moderate') return '#FFD966';
          return '#F4B183';
        })
        .attr('stroke-width', 1);

      node.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-family', 'Inter, sans-serif')
        .attr('font-size', '14px')
        .attr('font-weight', '500')
        .attr('fill', '#141414')
        .selectAll('tspan')
        .data(d => d.label.split(' '))
        .enter().append('tspan')
        .attr('x', 0)
        .attr('dy', (d, i) => i === 0 ? 0 : '1.2em')
        .text(d => d);

      simulation.on('tick', () => {
        // Bounding box constraint
        nodes.forEach(d => {
          const r = 40 + (d.css * 30);
          d.x = Math.max(r, Math.min(width - r, d.x || 0));
          d.y = Math.max(r, Math.min(height - r, d.y || 0));
        });

        link
          .attr('x1', d => (d.source as any).x)
          .attr('y1', d => (d.source as any).y)
          .attr('x2', d => (d.target as any).x)
          .attr('y2', d => (d.target as any).y);

        node
          .attr('transform', d => `translate(${d.x},${d.y})`);
      });

      // Initial fit
      simulation.on('end', () => {
        const bounds = g.node()?.getBBox();
        if (bounds) {
          const fullWidth = width;
          const fullHeight = height;
          const midX = bounds.x + bounds.width / 2;
          const midY = bounds.y + bounds.height / 2;
          const scale = 0.8 / Math.max(bounds.width / fullWidth, bounds.height / fullHeight);
          svg.transition().duration(750).call(
            zoom.transform,
            d3.zoomIdentity
              .translate(fullWidth / 2, fullHeight / 2)
              .scale(scale)
              .translate(-midX, -midY)
          );
        }
      });

      function dragstarted(event: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event: any) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

      return simulation;
    };

    const sim = updateGraph();

    const resizeObserver = new ResizeObserver(() => {
      updateGraph();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      sim?.stop();
      resizeObserver.disconnect();
    };
  }, [concepts, edges, onNodeClick]);

  return (
    <div className="space-y-4 w-full">
      {/* Titles and Captions moved out of absolute positioning to flow above the graph */}
      <div className="space-y-1">
        <h3 className="font-sans font-bold text-sm text-[#141414]">Semantic Knowledge Graph</h3>
        <div className="space-y-1">
          <p className="text-[10px] text-[#71717A]">Embedding Similarity Threshold = 0.30</p>
          <p className="text-[10px] text-[#71717A]">Community Detection: Modularity-Based Clustering</p>
          <p className="text-[10px] italic text-[#71717A] mt-2">Node size represents concept strength. Edges represent semantic similarity.</p>
        </div>
      </div>

      <div ref={containerRef} className="w-full h-[800px] bg-white border border-[#E4E4E7] rounded-xl relative overflow-hidden shadow-sm">
        <svg ref={svgRef} className="w-full h-full" />

        {/* Controls */}
        <div className="absolute top-6 right-6 z-10 flex flex-col gap-2">
          <button 
            onClick={() => {
              if (!svgRef.current || !containerRef.current) return;
              const svg = d3.select(svgRef.current);
              const width = containerRef.current.clientWidth;
              const height = containerRef.current.clientHeight;
              const g = svg.select('g');
              const bounds = (g.node() as SVGGElement)?.getBBox();
              if (bounds) {
                const midX = bounds.x + bounds.width / 2;
                const midY = bounds.y + bounds.height / 2;
                const scale = 0.8 / Math.max(bounds.width / width, bounds.height / height);
                const zoom = d3.zoom<SVGSVGElement, unknown>();
                svg.transition().duration(750).call(
                  zoom.transform,
                  d3.zoomIdentity
                    .translate(width / 2, height / 2)
                    .scale(scale)
                    .translate(-midX, -midY)
                );
              }
            }}
            className="p-2 bg-white border border-[#E4E4E7] rounded-lg shadow-sm hover:bg-[#F4F4F5] transition-colors text-[#141414]"
            title="Reset View"
          >
            <Search size={16} />
          </button>
        </div>

        {/* Legend - stays bottom-left inside graph */}
        <div className="absolute bottom-6 left-6 z-10 bg-white/90 backdrop-blur-sm p-3 border border-[#E4E4E7] rounded-lg space-y-2 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#E2F0D9] border border-[#A9D18E]" />
            <span className="text-[10px] font-medium">Strong (≥80%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FFF2CC] border border-[#FFD966]" />
            <span className="text-[10px] font-medium">Moderate (60-79%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#F8CBAD] border border-[#F4B183]" />
            <span className="text-[10px] font-medium">Weak (&lt;60%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
