(function (target) {
function cubicPoint(progress, start, controlA, controlB, end) {
  const inverse = 1 - progress;
  return {
    x: inverse ** 3 * start.x + 3 * inverse ** 2 * progress * controlA.x + 3 * inverse * progress ** 2 * controlB.x + progress ** 3 * end.x,
    y: inverse ** 3 * start.y + 3 * inverse ** 2 * progress * controlA.y + 3 * inverse * progress ** 2 * controlB.y + progress ** 3 * end.y
  };
}


function createPlannerPhysics() {
return {
  active: false,
  locked: false,
  committing: false,
  cursor: 30,
  originPosition: 0,
  selected: null,
  nodes: [],
  maxNodes: 2,
  maxDeltaV: 600,
  sun: { x: 420, y: 390 },
  earth: { x: 694, y: 98 },
  integrationSteps: 2200,
  integrationDt: .064,
  baseVelocity: 35,
  burnVelocityScale: .18,
  solarMu: 22000,
  gravitySoftening: 2200,
  commitFrame: null,
  enterHeld: false,

  pointAt(position) {
    return cubicPoint(position / 100, { x: 76, y: 126 }, { x: 285, y: 136 }, { x: 555, y: 350 }, { x: 420, y: 390 });
  },

  totalDeltaV() {
    return this.nodes.reduce((total, node) => total + node.deltaV, 0);
  },

  sortedNodes() {
    return [...this.nodes].sort((left, right) => left.position - right.position);
  },

  sortNodesInPlace(selectedNode = this.selected === null ? null : this.nodes[this.selected]) {
    this.nodes.sort((left, right) => left.position - right.position);
    this.selected = selectedNode ? this.nodes.indexOf(selectedNode) : null;
  },

  localProgress(position) {
    return (position - this.originPosition) / Math.max(1, 100 - this.originPosition);
  },

  positionBounds() {
    const max = 99.8;
    const baseMin = Math.min(max, this.originPosition + 1);
    if (this.nodes.length && this.selected !== 0) {
      const firstNode = this.nodes[0];
      return { min: Math.min(max, firstNode.position + 1), max };
    }
    const secondNode = this.selected === 0 ? this.nodes[1] : null;
    const cappedMax = secondNode ? Math.max(baseMin, secondNode.position - 1) : max;
    const min = Math.min(cappedMax, baseMin);
    return { min, max: cappedMax };
  },

  orbitStepFor(position, firstNode = this.nodes[0]) {
    if (!firstNode) return 0;
    const span = Math.max(1, 99.8 - firstNode.position);
    const progress = Math.max(0, Math.min(1, (position - firstNode.position) / span));
    return Math.max(1, Math.min(this.integrationSteps - 1, Math.round(progress * (this.integrationSteps - 1))));
  },

  pointOnPlannedPath(position, trajectory, nodeIndex = null) {
    if (!this.nodes.length || nodeIndex === 0 || position <= this.nodes[0].position) return this.pointAt(position);
    const step = this.orbitStepFor(position, this.nodes[0]);
    const pointIndex = Math.min(trajectory.points.length - 1, trajectory.orbitStartIndex + step);
    return trajectory.points[pointIndex] || this.pointAt(position);
  },

  progradeAt(position) {
    const before = this.pointAt(Math.max(this.originPosition, position - .15));
    const after = this.pointAt(Math.min(100, position + .15));
    const length = Math.hypot(after.x - before.x, after.y - before.y) || 1;
    return { x: (after.x - before.x) / length, y: (after.y - before.y) / length };
  },

  burnDirection(node) {
    const prograde = this.progradeAt(node.position);
    const heading = Math.atan2(prograde.y, prograde.x) + (node.angle * Math.PI / 180);
    return { x: Math.cos(heading), y: Math.sin(heading) };
  },

  directionFromVelocity(state, node) {
    const velocityLength = Math.hypot(state.vx, state.vy) || 1;
    const heading = Math.atan2(state.vy / velocityLength, state.vx / velocityLength) + (node.angle * Math.PI / 180);
    return { x: Math.cos(heading), y: Math.sin(heading) };
  },

  gravityAt(point) {
    const dx = this.sun.x - point.x;
    const dy = this.sun.y - point.y;
    const distanceSquared = Math.max(this.gravitySoftening, dx * dx + dy * dy);
    const distance = Math.sqrt(distanceSquared);
    return { x: this.solarMu * dx / (distanceSquared * distance), y: this.solarMu * dy / (distanceSquared * distance) };
  },

  trajectory() {
    const nodes = this.sortedNodes();
    const points = [];
    const burnPositions = [];
    const burnVectors = [];
    let orbitStartIndex = 0;

    if (!nodes.length) {
      for (let step = 0; step <= 160; step += 1) {
        const position = this.originPosition + ((100 - this.originPosition) * step / 160);
        points.push(this.pointAt(position));
      }
      return { points, burnPositions, burnVectors, orbitStartIndex };
    }

    const firstNode = nodes[0];
    const coastSteps = Math.max(8, Math.round((firstNode.position - this.originPosition) * 2.5));
    for (let step = 0; step <= coastSteps; step += 1) {
      const position = this.originPosition + ((firstNode.position - this.originPosition) * step / coastSteps);
      points.push(this.pointAt(position));
    }
    orbitStartIndex = points.length - 1;

    const burnPoint = this.pointAt(firstNode.position);
    const prograde = this.progradeAt(firstNode.position);
    const direction = this.burnDirection(firstNode);
    const state = {
      x: burnPoint.x,
      y: burnPoint.y,
      vx: prograde.x * this.baseVelocity + direction.x * firstNode.deltaV * this.burnVelocityScale,
      vy: prograde.y * this.baseVelocity + direction.y * firstNode.deltaV * this.burnVelocityScale
    };
    burnPositions[0] = { x: state.x, y: state.y };
    burnVectors[0] = direction;

    let nextNodeIndex = 1;
    for (let step = 0; step < this.integrationSteps; step += 1) {
      while (nextNodeIndex < nodes.length && step >= this.orbitStepFor(nodes[nextNodeIndex].position, firstNode)) {
        const nextNode = nodes[nextNodeIndex];
        const nextDirection = this.directionFromVelocity(state, nextNode);
        state.vx += nextDirection.x * nextNode.deltaV * this.burnVelocityScale;
        state.vy += nextDirection.y * nextNode.deltaV * this.burnVelocityScale;
        burnPositions[nextNodeIndex] = { x: state.x, y: state.y };
        burnVectors[nextNodeIndex] = nextDirection;
        nextNodeIndex += 1;
      }
      const acceleration = this.gravityAt(state);
      state.vx += acceleration.x * this.integrationDt;
      state.vy += acceleration.y * this.integrationDt;
      state.x += state.vx * this.integrationDt;
      state.y += state.vy * this.integrationDt;
      points.push({ x: state.x, y: state.y });
    }

    return { points, burnPositions, burnVectors, orbitStartIndex };
  },

  captureDistance(points) {
    let nearest = Infinity;
    for (let index = 1; index < points.length; index += 1) {
      const start = points[index - 1];
      const end = points[index];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const denominator = dx * dx + dy * dy || 1;
      const projection = Math.max(0, Math.min(1, ((this.earth.x - start.x) * dx + (this.earth.y - start.y) * dy) / denominator));
      const closestX = start.x + dx * projection;
      const closestY = start.y + dy * projection;
      nearest = Math.min(nearest, Math.hypot(this.earth.x - closestX, this.earth.y - closestY));
    }
    return nearest;
  },

  trajectoryData() {
    const { points, burnPositions, burnVectors, orbitStartIndex } = this.trajectory();
    const captureDistance = this.captureDistance(points);
    return { points, burnPositions, burnVectors, orbitStartIndex, captureDistance, captured: captureDistance <= 33 };
  },

  validTransfer() {
    return this.trajectoryData().captured;
  },

  pathFromPoints(points) {
    const isVisible = (point) => point.x >= -80 && point.x <= 900 && point.y >= -60 && point.y <= 560;
    let drawing = false;
    return points.map((point, index) => {
      if (!isVisible(point)) {
        drawing = false;
        return '';
      }
      const command = index && drawing ? 'L' : 'M';
      drawing = true;
      return `${command}${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    }).filter(Boolean).join(' ');
  },


};
}
if (typeof module !== 'undefined' && module.exports) module.exports = { createPlannerPhysics };
else target.createPlannerPhysics = createPlannerPhysics;
})(typeof window === 'undefined' ? globalThis : window);
