package graph

import (
	"container/heap"
	"math"
	"slices"
)

type Route struct {
	From     string
	To       string
	Path     []string
	Distance float64
}

// NearestSourceRoute runs a single multi-source Dijkstra: every source starts at distance 0,
// so the first time the target is settled it is reached from its nearest source.
// Complexity: O((V + E) log V). Ties are broken by the order of sources in the request.
func (n *Network) NearestSourceRoute(sources []string, target string) (Route, error) {
	if len(sources) == 0 {
		return Route{}, newError(KindInvalidRequest, nil, "at least one depot is required")
	}
	targetID, ok := n.index[target]
	if !ok {
		return Route{}, newError(KindUnknownNode, map[string]any{"node": target, "role": "accidentLocation"},
			"accident location %q is not part of the graph", target)
	}

	size := len(n.names)
	dist := make([]float64, size)
	prev := make([]int, size)
	origin := make([]int, size)
	settled := make([]bool, size)
	for i := range dist {
		dist[i], prev[i], origin[i] = math.Inf(1), -1, math.MaxInt
	}

	queue := &priorityQueue{}
	rank := 0
	for _, source := range sources {
		id, ok := n.index[source]
		if !ok {
			return Route{}, newError(KindUnknownNode, map[string]any{"node": source, "role": "depot"},
				"depot %q is not part of the graph", source)
		}
		if origin[id] != math.MaxInt {
			continue
		}
		dist[id], origin[id] = 0, rank
		heap.Push(queue, queueItem{node: id, dist: 0, origin: rank})
		rank++
	}

	for queue.Len() > 0 {
		current := heap.Pop(queue).(queueItem)
		if settled[current.node] || current.dist != dist[current.node] || current.origin != origin[current.node] {
			continue
		}
		settled[current.node] = true
		if current.node == targetID {
			return n.buildRoute(prev, targetID, current.dist), nil
		}
		for _, e := range n.adj[current.node] {
			if settled[e.to] {
				continue
			}
			candidate := current.dist + e.weight
			if candidate < dist[e.to] || (candidate == dist[e.to] && current.origin < origin[e.to]) {
				dist[e.to], origin[e.to], prev[e.to] = candidate, current.origin, current.node
				heap.Push(queue, queueItem{node: e.to, dist: candidate, origin: current.origin})
			}
		}
	}

	return Route{}, newError(KindUnreachable,
		map[string]any{"accidentLocation": target, "depots": sources},
		"accident location %q is not reachable from any depot", target)
}

func (n *Network) buildRoute(prev []int, target int, distance float64) Route {
	path := []string{}
	for node := target; node != -1; node = prev[node] {
		path = append(path, n.names[node])
	}
	slices.Reverse(path)
	return Route{From: path[0], To: n.names[target], Path: path, Distance: distance}
}

type queueItem struct {
	node   int
	dist   float64
	origin int
}

type priorityQueue []queueItem

func (q priorityQueue) Len() int { return len(q) }
func (q priorityQueue) Less(i, j int) bool {
	if q[i].dist != q[j].dist {
		return q[i].dist < q[j].dist
	}
	if q[i].origin != q[j].origin {
		return q[i].origin < q[j].origin
	}
	return q[i].node < q[j].node
}
func (q priorityQueue) Swap(i, j int) { q[i], q[j] = q[j], q[i] }
func (q *priorityQueue) Push(x any)   { *q = append(*q, x.(queueItem)) }
func (q *priorityQueue) Pop() any {
	old := *q
	item := old[len(old)-1]
	*q = old[:len(old)-1]
	return item
}
