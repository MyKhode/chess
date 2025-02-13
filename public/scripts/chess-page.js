/* global $, io, Chess, Chessboard  */
require("dotenv").config();
//update cash of player
const { createClient } = supabase;
const _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
async function updateCash(userId, isWin) {
  const betAmount = 2500; // Cash to be added/subtracted

  try {
    // Fetch current money from the 'cash' table
    let { data: cashData, error } = await _supabase
      .from('cash')
      .select('money')
      .eq('id', userId)
      .single(); // Single ensures we get only one result

    if (error) {
      throw error; // Throw error for better handling
    }

    if (!cashData || typeof cashData.money !== 'number') {
      console.error('Invalid cash data:', cashData);
      return;
    }

    const currentCash = cashData.money;

    // Calculate the new balance based on whether the user won or lost
    const updatedCash = isWin ? currentCash + betAmount : currentCash - betAmount;

    // Update the user's cash in the database
    let { data: updatedData, updateError } = await _supabase
      .from('cash')
      .update({ money: updatedCash })
      .eq('id', userId)
      .select();

    if (updateError) {
      throw updateError;
    }

    // Update localStorage with the new balance
    localStorage.setItem('currentMoney', updatedCash);
    console.log('Cash updated successfully:', updatedData);
  } catch (err) {
    console.error('Error updating cash:', err.message);
  }
}

// Determine if the game is over and if you are the winner or loser
function checkGameOutcome() {
  if (game.game_over()) {
    const isCheckmate = game.in_checkmate();
    const yourTurn = (side === 'w' && game.turn() === 'b') || (side === 'b' && game.turn() === 'w');

    if (isCheckmate && yourTurn) {
      // You win the game
      alert("You win!");
      updateCash(userId, 1); // Update your cash for winning
    } else if (isCheckmate && !yourTurn) {
      // You lose the game
      alert("You lose!");
      updateCash(userId, 0); // Update your cash for losing
    } else {
      // The game is a draw or over due to other reasons
      alert(reasonGameOver());
    }
  }
}

// Call this function when a game ends
if (game.game_over()) {
  checkGameOutcome();
}



// getting values from get request
const params = new URLSearchParams(window.location.search);
const roomName = params.get('roomName');
const userName = params.get('userName');

// preparing variables
let board = null;
const game = new Chess();
// const whiteSquareGrey = '#a9a9a9';
// const blackSquareGrey = '#696969';
const whiteSquareGrey = '#c4f296';
const blackSquareGrey = '#4bd84b';
const socket = io();
let side;
let lastFen = '';
let finished = false;

const topParagraph = document.getElementById('top');

// create string with reason why game is over
function reasonGameOver() {
  if (game.in_checkmate()) {
    if (game.turn() === 'w') {
      return 'Black Wins!';
    }
    return 'White Wins!';
  }
  if (game.in_draw()) {
    return 'Draw!';
  }
  if (game.in_threefold_repetition()) {
    return 'Threefold repetition!';
  }
  if (game.in_stalemate()) {
    return 'Stalemate!';
  }
  if (game.in_insufficient_material()) {
    return 'Insufficient material!';
  }
  return '';
}

function findKing(color) {
  const b = game.board();
  for (let i = 0; i < 8; i += 1) {
    for (let j = 0; j < 8; j += 1) {
      if (b[i][j] != null && b[i][j].type === 'k' && b[i][j].color === color) {
        // return letter + number
        return `${String.fromCharCode(97 + j)}${8 - i}`;
      }
    }
  }
  return null;
}
//edited by ikhode
function updateBoard(fen) {
  if (fen !== game.fen()) {
    lastFen = game.fen();
    game.load(fen);
    board.position(fen);
  }

  if (game.turn() === 'w') {
    h2White.classList.add('colored');
    h2Black.classList.remove('colored');
  } else {
    h2Black.classList.add('colored');
    h2White.classList.remove('colored');
  }

  if (game.in_check()) {
    const kingSquare = findKing(game.turn());
    $(`#myBoard .square-${kingSquare}`).addClass('check-square');
  } else {
    $('.check-square').removeClass('check-square');
  }

  if (game.game_over() && !finished) {
    checkGameOutcome();  // Check who won and update cash accordingly
    finished = true;
  }
}

// // update page after a move is made
// function updateBoard(fen) {
//   // update board
//   // console.log("updateBoard");
//   if (fen !== game.fen()) {
//     // console.log('saving fen');
//     lastFen = game.fen();

//     game.load(fen);
//     board.position(fen);
//   }

//   // setting h2 color based on game turn
//   const h2White = document.getElementById('h2White');
//   const h2Black = document.getElementById('h2Black');
//   if (game.turn() === 'w') {
//     // get h2 with id h2White
//     h2White.classList.add('colored');
//     h2Black.classList.remove('colored');
//   } else {
//     h2Black.classList.add('colored');
//     h2White.classList.remove('colored');
//   }
//   // if someone is in check, highlight king square
//   if (game.in_check()) {
//     console.log('in check');
//     console.log(game.turn());
//     const kingSquare = findKing(game.turn());
//     console.log(kingSquare);
//     $(`#myBoard .square-${kingSquare}`).addClass('check-square');
//   } else {
//     $('.check-square').removeClass('check-square');
//   }

//   // check if game is finished, if so, show reason
//   if (game.game_over() && !finished) {
//     alert(reasonGameOver());

//     finished = true;
//   }
// }

// joining socket room
socket.emit('join_room', roomName, userName);

// updating page based on room status
socket.on('room_status', (room) => {
  // update board
  if (room.fen !== null) {
    game.load(room.fen);
    board.position(room.fen);
  }
  // clearing flag for game over
  finished = false;

  // creating elements to display
  const h1 = document.createElement('h1');
  const h2White = document.createElement('h2');
  const h2Black = document.createElement('h2');
  const h2Vs = document.createElement('h2');
  const h3 = document.createElement('h3');
  const restartButton = document.createElement('button');
  const switchSidesButton = document.createElement('button');
  const showLastMoveButton = document.createElement('button');

  // settings ids
  restartButton.id = 'restartButton';
  switchSidesButton.id = 'switchSidesButton';
  showLastMoveButton.id = 'showLastMoveButton';
  h2White.id = 'h2White';
  h2Black.id = 'h2Black';

  // setting player's names
  const whiteName = room.white.name ? room.white.name : 'Waiting for Player';
  const blackName = room.black.name ? room.black.name : 'Waiting for Player';

  // settings restartButton status
  if (room.restart === '') {
    restartButton.classList.remove('background-colored');
  } else {
    restartButton.classList.add('background-colored');
  }

  // creating logic for restart button
  restartButton.textContent = 'Restart game';
  restartButton.onclick = () => {
    if (!room.restart) {
      console.log('requesting restart');
      socket.emit('restart_request');
    } else if (room.restart !== side) {
      console.log('granting restart');
      socket.emit('restart_grant');
    }
  };

  // creating logic for switchSides button
  switchSidesButton.textContent = 'Switch sides';
  if (room.switch === '') {
    switchSidesButton.classList.remove('background-colored');
  } else {
    switchSidesButton.classList.add('background-colored');
  }
  switchSidesButton.onclick = () => {
    if (!room.switch) {
      console.log('requesting switch');
      socket.emit('switch_request');
    } else if (room.switch !== side) {
      console.log('granting switch');
      socket.emit('switch_grant');
    }
  };

  // creating logic for showLastMove button
  showLastMoveButton.textContent = 'Show last move';
  showLastMoveButton.onclick = () => {
    console.log(lastFen === game.fen());
    if (game.validate_fen(lastFen)) {
      // console.log("last fen validated");
      if (showLastMoveButton.classList.contains('background-colored')) {
        showLastMoveButton.classList.remove('background-colored');
        board.position(game.fen());
        // console.log("used game.fen()");
      } else {
        showLastMoveButton.classList.add('background-colored');
        board.position(lastFen);
        // console.log("used lastFen");
      }
    }
  };

  // setting buttons inside h1
  // if you are a spectator, you can't switch sides or restart the game
  if (side !== 's') {
    h1.appendChild(restartButton);
    h1.appendChild(switchSidesButton);
  }
  h1.appendChild(showLastMoveButton);

  // setting h2 texts
  h2White.textContent = `${whiteName}`;
  h2Black.textContent = `${blackName}`;
  h2Vs.textContent = ' vs ';

  // setting h2 color based on game turn
  if (game.turn() === 'w') {
    h2White.classList.add('colored');
    h2Black.classList.remove('colored');
  } else {
    h2Black.classList.add('colored');
    h2White.classList.remove('colored');
  }

  h3.textContent = `Spectators: ${room.spectators.length}`;

  // clearing top paragraph
  topParagraph.textContent = '';

  // appending elements to top paragraph
  topParagraph.appendChild(h1);
  topParagraph.appendChild(h2White);
  topParagraph.appendChild(h2Vs);
  topParagraph.appendChild(h2Black);
  topParagraph.appendChild(h3);
});

// setting side based on server assignment
socket.on('side', (sideServer) => {
  // console.log("side: " + sideServer);
  side = sideServer;
  if (side === 'b') {
    board.orientation('black');
  } else {
    board.orientation('white');
  }
});

function removeHighlights() {
  $('#myBoard .square-55d63').removeClass('highlight-square');
}

socket.on('update_board', (fen) => {
  // update board
  updateBoard(fen);
  removeHighlights();
});

socket.on('move', (move) => {
  // highlight last move
  removeHighlights();
  $(`#myBoard .square-${move.from}`).addClass('highlight-square');
  $(`#myBoard .square-${move.to}`).addClass('highlight-square');
});

// removes colored squares
function removeGreySquares() {
  $('#myBoard .square-55d63').css('background', '');
}

// add color to a square
function greySquare(square) {
  // console.log(square);
  const $square = $(`#myBoard .square-${square}`);

  let background = whiteSquareGrey;
  if ($square.hasClass('black-3c85d')) {
    background = blackSquareGrey;
  }

  $square.css('background', background);
}

// handle when the player picks a piece up
function onDragStart(_source, piece) {
  // reset showLastMoveButton
  const showLastMoveButton = document.getElementById('showLastMoveButton');
  showLastMoveButton.classList.remove('background-colored');

  // do not pick up pieces if it's not your turn
  if (game.turn() !== side) {
    // console.log("not your turn");
    return false;
  }

  // do not pick up pieces if the game is over
  if (game.game_over()) return false;

  // or if it's not that side's turn
  if (
    (game.turn() === 'w' && piece.search(/^b/) !== -1)
    || (game.turn() === 'b' && piece.search(/^w/) !== -1)
  ) {
    return false;
  }
  return true;
}

// handle when a player drops a piece
function onDrop(source, target) {
  // remove the colored squares that show possible moves
  removeGreySquares();

  lastFen = game.fen();

  // see if the move is legal
  const move = game.move({
    from: source,
    to: target,
    promotion: 'q', // NOTE: always promote to a queen for example simplicity
  });

  updateBoard(game.fen());

  // illegal move
  if (move === null) return 'snapback';

  // notify server about move
  socket.emit('move', move.san);
  return true;
}

// handle mouse over a square by showing possible moves
function onMouseoverSquare(square, piece) {
  // do not show moves if you are not playing
  if (side === 's') return false;

  // do not show moves if the piece isn't yours
  if (piece === false) return false;

  // do not show moves if you aren't the side whose turn it is
  if (piece.charAt(0) !== side) return false;

  // get list of possible moves for this square
  const moves = game.moves({
    square,
    verbose: true,
  });

  // exit if there are no moves available for this square
  if (moves.length === 0) return false;

  // highlight the square they moused over
  greySquare(square);

  // highlight the possible squares for this piece
  for (let i = 0; i < moves.length; i += 1) {
    greySquare(moves[i].to);
  }
  return true;
}

// if mouse leaves a square, remove the possible moves highlight
function onMouseoutSquare(/* square, piece */) {
  removeGreySquares();
}

// handle multiple pieces moves like castling, en passant, pawn promotion
function onSnapEnd() {
  board.position(game.fen());
}

// setting board config
const config = {
  draggable: true,
  position: 'start',
  pieceTheme: 'images/pieces/{piece}.png',
  onDragStart,
  onDrop,
  onMouseoutSquare,
  onMouseoverSquare,
  onSnapEnd,
};

// initializing board with config
board = Chessboard('myBoard', config);

window.onresize = () => {
  config.position = game.fen();
  board = Chessboard('myBoard', config);
};
