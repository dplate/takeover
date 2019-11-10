const checkForBeenOverTaken = async (field) => {
  const countPerPlayer = Object.values(field.neighbours.reduce((aggregation, neighbour) => {
    if (neighbour.player) {
      return {
        ...aggregation,
        [neighbour.player.id]: {
          player: neighbour.player,
          count: ((aggregation[neighbour.player.id] && aggregation[neighbour.player.id].count) || 0) + 1
        }
      }
    }
    return aggregation;
  }, {}));
  const dominantPlayerCountInfo = countPerPlayer.find(countInfo => countInfo.count > Math.floor(field.neighbours.length / 2));
  if (dominantPlayerCountInfo && isTakeOverAllowed(field) &&
    (!field.player || dominantPlayerCountInfo.player.id !== field.player.id)) {
    await new Promise((resolve) => window.setTimeout(
      async () => {
        await takeOverField(field, dominantPlayerCountInfo.player);
        resolve();
      },
      500
    ))
  }
};

const takeOverNeighbours = async (field) => {
  for (const neighbour of field.neighbours) {
    await checkForBeenOverTaken(neighbour);
  }
};

const takeOverField = async (field, player, block = false) => {
  field.player = player;
  field.hexagon.style.fill = player.color;
  if (block) {
    field.blocked = field.blocks.length + 1;
  }
  await takeOverNeighbours(field);
};

const isTakeOverAllowed = (field) => {
  return !field.blocked;
};

const reduceBlocks = async (fields) => {
  for (const field of fields) {
    if (field.blocked) {
      field.blocked--;
      field.blocks.forEach((block, index) => block.style.fillOpacity = index < field.blocked ? '1' : '0');
      await checkForBeenOverTaken(field);
    }
  }
};

const updateSelectable = (fields) => {
  fields.forEach(field => field.hexagon.classList.toggle('selectable', isTakeOverAllowed(field)));
};

const removeSelectable = (fields) => {
  fields.forEach(field => field.hexagon.classList.remove('selectable'));
};

const startRound = async (game) => {
  await reduceBlocks(game.fields);
  game.currentPlayer = game.players[(game.currentPlayer.id + 1) % game.players.length];
  updateSelectable(game.fields);
  document.getElementById('board').style.backgroundColor = game.currentPlayer.color;
  game.playersMustWait = false;
};

const endRound = (game) => {
  game.playersMustWait = true;
  removeSelectable(game.fields);
  document.getElementById('board').style.backgroundColor = 'black';
};

const onFieldClick = async (game, field) => {
  if (!game.playersMustWait && isTakeOverAllowed(field)) {
    endRound(game);
    await takeOverField(field, game.currentPlayer, true);
    await startRound(game);
  }
};

const assignActions = (game) => {
  game.fields.forEach(field => {
    field.hexagon.addEventListener('click', onFieldClick.bind(null, game, field));
  });
};

createHexagon = (hexForm) => {
  const hexagon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  hexagon.classList.add('hexagon');
  hexagon.setAttribute('points', `${hexForm},0 ${1-hexForm},0 1,0.5 ${1-hexForm},1 ${hexForm},1 0,0.5`);
  return hexagon;
};

createBlocks = (blockCount) => {
  const blocks = [];
  for (let angle = 0; angle < 2 * Math.PI; angle += 2 * Math.PI / blockCount) {
    const block = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    block.classList.add('block');
    block.setAttribute('cx', `${0.5 + Math.sin(angle) * 0.15}`);
    block.setAttribute('cy', `${0.5 - Math.cos(angle) * 0.15}`);
    block.setAttribute('r', '0.04');
    blocks.push(block);
  }
  return blocks;
};

const createElements = (cols, rows, blockCount, x, y) => {
  const HEX_FORM = 3/10;
  const BORDER_WIDTH = 0.02;

  const field = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const borderTransform = `scale(${1-2*BORDER_WIDTH}, ${1-2*BORDER_WIDTH}) translate(${BORDER_WIDTH}, ${BORDER_WIDTH})`;
  const fieldTransform = `scale(${1/(cols*(1-HEX_FORM)+HEX_FORM)}, ${1/(rows+0.5)}) translate(${x*(1-HEX_FORM)}, ${y+(x%2)/2})`;
  field.setAttribute('transform', `${borderTransform} ${fieldTransform}`);

  const hexagon = createHexagon(HEX_FORM);
  field.appendChild(hexagon);

  const blocks = createBlocks(blockCount);
  blocks.forEach(block => field.appendChild(block));

  document.getElementById('board').appendChild(field);
  return { hexagon, blocks };
};

const createField = (cols, rows, blockCount, x, y) => {
  const { hexagon, blocks } = createElements(cols, rows, blockCount, x, y);
  return {
    x,
    y,
    hexagon,
    blocks,
    neighbours: [],
    player: null,
    blocked: 0
  };
};

const createFields = (cols, rows, blockCount) => {
  const fields = [];
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      fields.push(createField(cols, rows, blockCount, x, y));
    }
  }
  return fields;
};

const assignNeighbours = (fields) => {
  fields.forEach(field => {
    const neighbourCoordinates = field.x % 2 ?
      [{x: 0, y: -1}, {x: -1, y: 0}, {x: 1, y: 0}, {x: -1, y: 1}, {x: 0, y: 1}, {x: 1, y: 1}]:
      [{x: -1, y: -1}, {x: 0, y: -1}, {x: 1, y: -1}, {x: -1, y: 0}, {x: 1, y: 0}, {x: 0, y: 1}];
    neighbourCoordinates.forEach(({ x: offsetX, y: offsetY }) => {
      const neighbour = fields.find((f) => f.x === field.x + offsetX && f.y === field.y + offsetY);
      neighbour && field.neighbours.push(neighbour);
    });
  });
};

const createGame = (fields) => {
  const players = [{
    id: 0,
    color: 'indianred'
  }, {
    id: 1,
    color: 'cadetblue'
  }];
  return {
    players,
    currentPlayer: players[0],
    fields,
    playersMustWait: true
  }
};

const init = async () => {
  const fields = createFields(9, 9, 5);
  assignNeighbours(fields);
  const game = createGame(fields);
  assignActions(game);
  await startRound(game);
};

document.addEventListener('DOMContentLoaded', init, false);