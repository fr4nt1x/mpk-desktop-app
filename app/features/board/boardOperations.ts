import {
  ArchiveEntry,
  Board,
  ColumnOptions,
  createTag,
} from '../../model/board';
import { Card, Task, createCard, createFlag } from '../../model/cards';
import { extractTasks } from '../../utils/stringUtils';

const removeCardWithIdFromColumn = (board, cardId) => {
  board.columns.forEach((column) => {
    const indexOfCard = column.cards.indexOf(cardId);
    if (indexOfCard > -1) {
      column.cards.splice(indexOfCard, 1);
    }
  });
};

const findIndexOfCardInBoardCards = (board, cardId) => {
  return board.cards.findIndex((card: Card) => card.id === cardId);
};

const addCardToColumnAtTopOrBottom = (column, cardId, addAtTheTop) => {
  if (addAtTheTop) {
    column.cards.splice(0, 0, cardId);
  } else {
    const indexToAddCardAt = column.cards.length;
    column.cards.splice(indexToAddCardAt, 0, cardId);
  }
};

export const moveCardFromColumnToColumn = (board, source, destination) => {
  if (destination == null) {
    return;
  }
  const sourceColumn = board.columns.find((it) => it.id === source.droppableId);
  const cardId = sourceColumn.cards[source.index];

  if (source.droppableId === destination.droppableId) {
    if (source.index === destination.index) {
      return;
    }
    sourceColumn.cards.splice(source.index, 1);
    sourceColumn.cards.splice(destination.index, 0, cardId);
  } else {
    sourceColumn.cards.splice(source.index, 1);
    const destinationColumn = board.columns.find(
      (it) => it.id === destination.droppableId
    );
    destinationColumn.cards.splice(destination.index, 0, cardId);
  }
  const card: Card = board.cards.find((it) => it.id === cardId);
  card.lastModified = Date.now();
};

export const addCardToBoard = (
  board,
  title,
  description,
  columnId,
  addAtTheTop,
  cardTags,
  cardNumber
) => {
  const card: Card = createCard(title, description, cardTags, cardNumber);
  board.cards.push(card);
  const columnToAddCardTo = board.columns.find((it) => it.id === columnId);
  addCardToColumnAtTopOrBottom(columnToAddCardTo, card.id, addAtTheTop);
};

export const removeCardFromBoard = (board, cardId) => {
  removeCardWithIdFromColumn(board, cardId);
  const index = board.cards.findIndex((card) => card.id === cardId);
  board.cards.splice(index, 1);
};

export const updateCardDetails = (
  cards,
  cardId,
  title,
  description,
  cardTags,
  deadline
) => {
  const card: Card = cards.find((it) => it.id === cardId);
  card.title = title;
  card.description = description;
  card.tags = cardTags;
  if (deadline !== card.deadline) {
    card.deadline = deadline;
    card.pastDeadline = false;
  }
  card.lastModified = Date.now();
};

export const updateColumnDetails = (
  board: Board,
  columnId: string,
  title: string,
  isLimiting: boolean,
  numberOfCardsLimit: number
) => {
  const columnToUpdate = board.columns.find((column) => column.id === columnId);
  if (columnToUpdate) {
    columnToUpdate.title = title;
    columnToUpdate.options = {
      limitNumber: numberOfCardsLimit,
      limiting: isLimiting,
    } as ColumnOptions;
  }
};

export const archiveTheCard = (board, cardId) => {
  removeCardWithIdFromColumn(board, cardId);
  const cardIndex = board.cards.findIndex((card) => card.id === cardId);
  const card = board.cards.splice(cardIndex, 1)[0];
  board.archive.push({ cardId, archivedOn: Date.now(), card });
};

export const setCardFlag = (cards, cardId, flag: boolean) => {
  const card: Card = cards.find((it) => it.id === cardId);
  if (!card.flag) {
    card.flag = createFlag(flag);
  }
  card.flag.status = flag;
  card.lastModified = Date.now();
};

export const addNewTag = (
  board: Board,
  name: string,
  color: string,
  textColor: string
) => {
  const newTag = createTag(name, color, textColor);
  board.tags.byId[newTag.id] = newTag;
  board.tags.allIds.push(newTag.id);
};

export const deleteTheTag = (board: Board, tagId: string) => {
  delete board.tags.byId[tagId];
  const indexOfTag = board.tags.allIds.indexOf(tagId);
  board.tags.allIds.splice(indexOfTag, 1);
  board.cards.forEach((card: Card) => {
    if (card.tags) {
      const tagInCard = card.tags.indexOf(tagId);
      card.tags.splice(tagInCard, 1);
    }
  });
  board.archive.forEach((entry) => {
    if (entry.card.tags) {
      const tagInCard = entry.card.tags.indexOf(tagId);
      entry.card.tags.splice(tagInCard, 1);
    }
  });
};

export const updateTheTag = (
  board: Board,
  id: string,
  name: string,
  color: string,
  textColor: string
) => {
  const theTag = board.tags.byId[id];
  theTag.name = name;
  theTag.color = color;
  theTag.textColor = textColor;
};

export const updateCardTask = (
  card: Card,
  taskIndex: number,
  taskDone: boolean
) => {
  const tasks: Array<Task> = extractTasks(card.description);
  const taskContent = tasks[taskIndex].content;
  const regex = `[-|+|*]\\s?\\[.*\\]\\s?${taskContent}`;
  const regexReplacement = new RegExp(regex, 'g');

  if (taskDone) {
    card.description = card.description.replace(
      regexReplacement,
      `- [x] ${taskContent}`
    );
  } else {
    card.description = card.description.replace(
      regexReplacement,
      `- [ ] ${taskContent}`
    );
  }
};

export const moveCardFromBoardToBoard = (
  boardsById,
  cardId,
  fromBoard,
  toBoardId,
  addAtTheTop
) => {
  removeCardWithIdFromColumn(fromBoard, cardId);
  const cardIndex = findIndexOfCardInBoardCards(fromBoard, cardId);
  const theCard: Card = fromBoard.cards.splice(cardIndex, 1)[0];
  theCard.tags = [];
  const toBoard: Board = boardsById[toBoardId];
  const newCardNumber = toBoard.cardsCounter + 1;
  toBoard.cardsCounter = newCardNumber;
  theCard.number = newCardNumber;
  const firstColumn = toBoard.columns[0];

  toBoard.cards.push(theCard);
  addCardToColumnAtTopOrBottom(firstColumn, theCard.id, addAtTheTop);
};

export const unarchiveCardsOnBoard = (cardIds: Array<string>, board: Board) => {
  cardIds.forEach((cardId) => {
    const index = board.archive.findIndex(
      (entry: ArchiveEntry) => entry.cardId === cardId
    );
    const { card } = board.archive[index];
    board.archive.splice(index, 1);
    board.cards.push(card);
    const lastColumn = board.columns[board.columns.length - 1];
    addCardToColumnAtTopOrBottom(lastColumn, card.id, true);
  });
};

export const deleteFromArchiveOnBoard = (
  cardIds: Array<string>,
  board: Board
) => {
  cardIds.forEach((cardId) => {
    const index = board.archive.findIndex(
      (entry: ArchiveEntry) => entry.cardId === cardId
    );
    board.archive.splice(index, 1);
  });
};
