const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

// Business logic functions
function validatePieceDimensions(pieces, sheetLength, sheetWidth) {
  for (const piece of pieces) {
    if (piece.length > sheetLength || piece.width > sheetWidth) {
      throw new Error(`Piece ${piece.length}x${piece.width} is larger than the sheet dimensions ${sheetLength}x${sheetWidth}.`);
    }
  }
}

function expandPieces(pieces) {
  return pieces.flatMap(({ length, width, quantity }) =>
    Array(quantity).fill({ length, width })
  );
}

function sortByAreaDescending(pieces) {
  return pieces.sort((a, b) => (b.length * b.width) - (a.length * a.width));
}

function canPlace(sheet, piece, x, y) {
  const { length: pieceLength, width: pieceWidth } = piece;
  for (let i = 0; i < pieceLength; i++) {
    for (let j = 0; j < pieceWidth; j++) {
      if (x + i >= sheet.length || y + j >= sheet[0].length || sheet[x + i][y + j]) {
        return false;
      }
    }
  }
  return true;
}

function placePiece(sheet, piece, x, y) {
  const { length: pieceLength, width: pieceWidth } = piece;
  for (let i = 0; i < pieceLength; i++) {
    for (let j = 0; j < pieceWidth; j++) {
      sheet[x + i][y + j] = true;
    }
  }
}

function optimize(pieces, sheetLength, sheetWidth, sheetQuantity) {
  validatePieceDimensions(pieces, sheetLength, sheetWidth);

  const expandedPieces = expandPieces(pieces);
  const sortedPieces = sortByAreaDescending(expandedPieces);

  const sheets = [];
  const addSheet = () => {
    sheets.push(Array.from({ length: sheetLength }, () => Array(sheetWidth).fill(false)));
  };

  if (sheetQuantity) {
    for (let i = 0; i < sheetQuantity; i++) {
      addSheet();
    }
  } else {
    addSheet(); // Start with one sheet and add more if needed
  }

  let totalPieceArea = 0;
  let totalSheetArea = 0;

  const placements = [];

  for (const piece of sortedPieces) {
    let placed = false;
    for (const sheet of sheets) {
      for (let x = 0; x <= sheetLength - piece.length; x++) {
        for (let y = 0; y <= sheetWidth - piece.width; y++) {
          if (canPlace(sheet, piece, x, y)) {
            placePiece(sheet, piece, x, y);
            placed = true;
            totalPieceArea += piece.length * piece.width;
            break;
          }
        }
        if (placed) break;
      }
      if (placed) break;
    }
    if (!placed) {
      if (sheetQuantity && sheets.length >= sheetQuantity) {
        totalPieceArea += piece.length * piece.width; // Count this piece as waste
      } else {
        addSheet();
        const newSheet = sheets[sheets.length - 1];
        placePiece(newSheet, piece, 0, 0);
        totalPieceArea += piece.length * piece.width;
      }
    }
  }

  totalSheetArea = sheets.length * sheetLength * sheetWidth;
  const waste = totalSheetArea - totalPieceArea;

  for (const sheet of sheets) {
    placements.push(sheet);
  }

  return { waste, placements };
}

// Express.js routing code
app.post('/optimize', (req, res) => {
  try {
    const { sheetLength, sheetWidth, sheetQuantity, pieces } = req.body;
    const result = optimize(pieces, sheetLength, sheetWidth, sheetQuantity);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});