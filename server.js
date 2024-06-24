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
    if ((piece.length > sheetLength && piece.length > sheetWidth) || (piece.width > sheetLength && piece.width > sheetWidth)) {
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

function canPlace(sheet, piece, x, y, rotated = false) {
  const pieceLength = rotated ? piece.width : piece.length;
  const pieceWidth = rotated ? piece.length : piece.width;

  if (x + pieceLength > sheet.length || y + pieceWidth > sheet[0].length) {
    return false;
  }

  for (let i = 0; i < pieceLength; i++) {
    for (let j = 0; j < pieceWidth; j++) {
      if (sheet[x + i][y + j]) {
        return false;
      }
    }
  }
  return true;
}

function placePiece(sheet, piece, x, y, color, rotated = false) {
  const pieceLength = rotated ? piece.width : piece.length;
  const pieceWidth = rotated ? piece.length : piece.width;

  for (let i = 0; i < pieceLength; i++) {
    for (let j = 0; j < pieceWidth; j++) {
      sheet[x + i][y + j] = color;
    }
  }
}

function getColorForDimensions(dimensions, colorMap) {
  const key = `${dimensions.length}x${dimensions.width}`;
  if (!colorMap[key]) {
    const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16);
    colorMap[key] = randomColor;
  }
  return colorMap[key];
}

function optimize(pieces, sheetLength, sheetWidth, sheetQuantity) {
  validatePieceDimensions(pieces, sheetLength, sheetWidth);

  const expandedPieces = expandPieces(pieces);
  const sortedPieces = sortByAreaDescending(expandedPieces);

  const sheets = [];
  const colorMap = {};
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

  for (const piece of sortedPieces) {
    let placed = false;
    const color = getColorForDimensions(piece, colorMap);
    for (const sheet of sheets) {
      for (let x = 0; x <= sheet.length - Math.min(piece.length, piece.width); x++) {
        for (let y = 0; y <= sheet[0].length - Math.min(piece.length, piece.width); y++) {
          if (canPlace(sheet, piece, x, y)) {
            placePiece(sheet, piece, x, y, color);
            placed = true;
            totalPieceArea += piece.length * piece.width;
            break;
          } else if (canPlace(sheet, piece, x, y, true)) { // Try rotated placement
            placePiece(sheet, piece, x, y, color, true);
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
        for (let x = 0; x <= newSheet.length - Math.min(piece.length, piece.width); x++) {
          for (let y = 0; y <= newSheet[0].length - Math.min(piece.length, piece.width); y++) {
            if (canPlace(newSheet, piece, x, y)) {
              placePiece(newSheet, piece, x, y, color);
              placed = true;
              totalPieceArea += piece.length * piece.width;
              break;
            } else if (canPlace(newSheet, piece, x, y, true)) { // Try rotated placement
              placePiece(newSheet, piece, x, y, color, true);
              placed = true;
              totalPieceArea += piece.length * piece.width;
              break;
            }
          }
          if (placed) break;
        }
      }
    }
  }

  const totalSheetArea = sheets.length * sheetLength * sheetWidth;
  const waste = totalSheetArea - totalPieceArea;

  return { waste, placements: sheets };
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
