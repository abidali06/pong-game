export function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
} // between two points.

export function randomRange(min, max) {
  return min + Math.random() * (max - min);
} // random real number in a range.

export function randomInt(min, max) {
  return Math.floor(randomRange(min, max + 1));
} // only integers.

export function randomChoice(array) {
  if (array.length === 0) {
    throw new Error("Cannot choose from an empty array.");
  }

  return array[Math.floor(Math.random() * array.length)];
} // choice from an array.

export function vectorMagnitude(x, y) {
  return Math.hypot(x, y);
}

export function getUnitVector(x, y) {
  const length = Math.hypot(x, y);

  if (length === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: x / length,
    y: y / length,
  };
} // returns unit vector for xi^ + yj^.

export function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

export function toDegrees(radians) {
  return (radians * 180) / Math.PI;
}

export function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
} // boolean. takes two rectangle object representations.

export function circlesOverlap(a, b) {
  return distance(a.x, a.y, b.x, b.y) < a.radius + b.radius;
} // same as above.

// advance physics
//=======================
/*
assumptions: 
1. vector objects look like this: 

const velocity = {
    x: 120,
    y: -50
};

2. and circular body objects like this: 

const ball = {
    x: 100,
    y: 150,

    vx: 120,
    vy: -50,

    radius: 20,
    mass: 2,

    restitution: 0.8,
    friction: 0.3
};
*/

export function addVectors(a, b) {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
  };
} // a and b are vector objects.

export function subtractVectors(a, b) {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
  };
}

export function scaleVector(v, scalar) {
  return {
    x: v.x * scalar,
    y: v.y * scalar,
  };
} // vector * scalar.

export function dotProduct(a, b) {
  return a.x * b.x + a.y * b.y;
}

export function perpendicularVector(v) {
  return {
    x: -v.y,
    y: v.x,
  };
}

export function inverseMass(body) {
  if (body.isStatic || body.mass <= 0) {
    return 0;
  }

  return 1 / body.mass;
}

export function applyForce(body, force, dt) {
  if (inverseMass(body) === 0) return;

  body.vx += force.x * inverseMass(body) * dt;
  body.vy += force.y * inverseMass(body) * dt;
} // changes velocity.

export function applyAcceleration(body, acceleration, dt) {
  if (inverseMass(body) === 0) return;

  body.vx += acceleration.x * dt;
  body.vy += acceleration.y * dt;
} // same as above.

export function integratePosition(body, dt) {
  if (inverseMass(body) === 0) return;

  body.x += body.vx * dt;
  body.y += body.vy * dt;
} // Updates position from velocity.

export function getCircleCollision(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  const distance = Math.hypot(dx, dy);
  const radii = a.radius + b.radius;

  if (distance >= radii) {
    return null;
  }

  let normal;

  if (distance === 0) {
    normal = { x: 1, y: 0 };
  } else {
    normal = {
      x: dx / distance,
      y: dy / distance,
    };
  }

  return {
    normal,
    penetration: radii - distance,
    distance,
  };
} // returns null for no collision otherwise returns object with .normal(a unit vector from A's center toward B's center.), .penetration(amount of penetration), and .distance(dist between centers).

export function resolveCircleCollision(a, b) {
  const collision = getCircleCollision(a, b);

  if (!collision) return null;

  const invA = inverseMass(a);
  const invB = inverseMass(b);
  const totalInvMass = invA + invB;

  // Both bodies are immovable.
  if (totalInvMass === 0) return collision;

  const { normal } = collision;

  // Relative velocity: velocity of B relative to A.
  const rv = {
    x: b.vx - a.vx,
    y: b.vy - a.vy,
  };

  const velocityAlongNormal = dotProduct(rv, normal);

  // Already separating or not approaching.
  if (velocityAlongNormal > 0) return collision;

  const restitution = Math.min(a.restitution ?? 0, b.restitution ?? 0);

  const j = (-(1 + restitution) * velocityAlongNormal) / totalInvMass;

  const impulse = {
    x: j * normal.x,
    y: j * normal.y,
  };

  a.vx -= impulse.x * invA;
  a.vy -= impulse.y * invA;

  b.vx += impulse.x * invB;
  b.vy += impulse.y * invB;

  return {
    ...collision,
    impulseMagnitude: j,
  };
} /* Returns:
- null if there is no overlap.
- Collision geometry if the bodies overlap but are both immovable or are already separating.
- Collision geometry plus impulseMagnitude if an impulse was calculated and applied.*/

export function resolveFriction(a, b, normalImpulse) {
  const invA = inverseMass(a);
  const invB = inverseMass(b);
  const totalInvMass = invA + invB;

  if (totalInvMass === 0 || normalImpulse <= 0) {
    return 0;
  }

  const collision = getCircleCollision(a, b);

  if (!collision) return 0;

  const { normal } = collision;

  const rv = {
    x: b.vx - a.vx,
    y: b.vy - a.vy,
  };

  // Remove the normal component to obtain the tangent.
  const normalSpeed = dotProduct(rv, normal);

  const tangent = normalizeVector({
    x: rv.x - normal.x * normalSpeed,
    y: rv.y - normal.y * normalSpeed,
  });

  if (tangent.x === 0 && tangent.y === 0) {
    return 0;
  }

  let jt = -dotProduct(rv, tangent) / totalInvMass;

  const friction = Math.sqrt(
    Math.max(0, a.friction ?? 0) * Math.max(0, b.friction ?? 0),
  );

  const maxFriction = normalImpulse * friction;

  jt = Math.max(-maxFriction, Math.min(jt, maxFriction));

  const impulse = {
    x: jt * tangent.x,
    y: jt * tangent.y,
  };

  a.vx -= impulse.x * invA;
  a.vy -= impulse.y * invA;

  b.vx += impulse.x * invB;
  b.vy += impulse.y * invB;

  return jt;
}

export function correctCircleOverlap(
  a,
  b,
  collision,
  percent = 0.8,
  slop = 0.01,
) {
  const invA = inverseMass(a);
  const invB = inverseMass(b);
  const totalInvMass = invA + invB;

  if (totalInvMass === 0) return;

  const depth = Math.max(collision.penetration - slop, 0);

  const correctionMagnitude = (depth / totalInvMass) * percent;

  const correction = {
    x: correctionMagnitude * collision.normal.x,
    y: correctionMagnitude * collision.normal.y,
  };

  a.x -= correction.x * invA;
  a.y -= correction.y * invA;

  b.x += correction.x * invB;
  b.y += correction.y * invB;
}

export function resolveCircleBounds(body, width, height, restitution = 1) {
  let hitX = false;
  let hitY = false;

  const r = body.radius;

  if (body.x - r < 0) {
    body.x = r;

    if (body.vx < 0) {
      body.vx = -body.vx * restitution;
    }

    hitX = true;
  } else if (body.x + r > width) {
    body.x = width - r;

    if (body.vx > 0) {
      body.vx = -body.vx * restitution;
    }

    hitX = true;
  }

  if (body.y - r < 0) {
    body.y = r;

    if (body.vy < 0) {
      body.vy = -body.vy * restitution;
    }

    hitY = true;
  } else if (body.y + r > height) {
    body.y = height - r;

    if (body.vy > 0) {
      body.vy = -body.vy * restitution;
    }

    hitY = true;
  }

  return { hitX, hitY };
} // handles circle hitting rectangular boundary. body is circle object. width and height are of boundary area. returns hitX and hitY, each a boolean.
