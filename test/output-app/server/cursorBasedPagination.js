/**
  * Relay like Cursor-based-Paging
  *
  * Use:
  * [<first>] <after>
  * [<last>] <before>
  *
  * Forward Pagination:
  * -------------------
  * first: takes a non-negative integer
  * after: takes the cursor type
  * -------------------
  * returning edges, <after> the cursor, at most <first> edges
  * 
  * Backward Navigation: 
  * --------------------
  * last: takes a non-negative integer
  * before: takes the cursor type
  * --------------------
  * returning edges, <before> the cursor, at most <last> edges
  *
  * Implementing the algorithm according the specification*
  * https://facebook.github.io/relay/graphql/connections.htm#sec-Edges
  * 
  * Pagination Algorithm:
  * ---------------------
  * Rules: <first> and <last> at the same time isn't allowed
  * 
  * 1. Filter by cursor:
  * To determine what edges to return, the connection evaluates
  * <before> or <after> cursors, to filter the edges.
  * 
  * 2. Slice the edges:
  * Evaluate <first> to slice the edges,
  * then evaluate <last> to slice the edges
  */

/** 
  * Contains the public methods for cursor-based Pagination
  * according to Relay Cursor Connections Specification
  *
  */


const cursorBasedPagination = {};
export default cursorBasedPagination;
  /**
   * checks the given arguments from a graphql request
   * and checks, if a valid combination of pagination
   * has been entered
   *
   * @public
   * @param {object} args - arguments, coming from graphql request
   * @return {boolean} valid - if pagination arguments are valid
   * @throw {Error} Error - on wrong pagination combination
   */

cursorBasedPagination.checkArguments = function (args) {
  const { skip, limit, first, after, last, before } = args;
  // checks, if a cursor-based navigation is requested
  if (first || after || last || before) {
    if (first && last) 
      throw new Error('Pagination: <first> and <last> can not be combined.');

    if (before && after)
      throw new Error('Pagination: <before> and <after> can not be combined.');

    if (first && first < 0) 
      throw new Error('Pagination: <first> must be greater 0');

    if (last < 0) 
      throw new Error('Pagination: <last> must be greater 0');

    if (skip || limit)
      throw new Error('Pagination: <skip>, <limit> can not be combined with cursor-based ([first]/after) or ([last]/before)');
  }
  return true;
}

cursorBasedPagination.get = function (allEdges, args) {
  return {
    edges: edgesToReturn(allEdges, args),
    pageInfo: {
      hasPreviousPage: hasPreviousPage(allEdges, args),
      hasNextPage: hasNextPage(allEdges, args)
    }
  };
}

/**
 * returns edges processed with first or last
 * @private
 * @param {array} allEdges - edges, to apply first or last onto
 * @param {object} args - arguments from the graphql request
 * @return {array} edges - the resulting edges
 */

function edgesToReturn(allEdges, args) {
  const { first, after, last, before } = args;

  let edges = applyCursorsToEdges(allEdges, before, after);

  if (first && last) throw new Error('Pagination: <first> and <last> can not be combined.');

  if (first) {
    if (first < 0) throw new Error('Pagination: <first> must be greater 0');
    if (edges.length > first) {
      edges = edges.slice(0, first);
    }
  }

  if (last) {
    if (last < 0) throw new Error('Pagination: <last> must be greater 0');
    if (edges.length > last) {
      edges = edges.slice(-last);
    }
  }

  return edges.map(edge => ({
    node: edge,
    cursor: edge._id
  }));

}

/**
 * position the array on the before or after cursor
 * @private
 * @param {array} allEdges - edges, to apply first or last onto
 * @param {string} before - contains ObjID (cursor) of a type
 * @parma {string} after - contains ObjID (cursor) of a type
 * @return {array} edges - the positioned array of edges
 */

function applyCursorsToEdges(allEdges, before, after) {
  let edges = allEdges;

  if (before && after) throw new Error('Pagination: <before> and <after> can not be combined.');

  if (after) {
    let cursorIndex = null;
    let afterEdge = null;

    allEdges.some((edge, index) => {
      if (edge && edge._id && edge._id.toString() === after) {
        cursorIndex = index;
        afterEdge = edge;
        return true;
      }
    });

    if (afterEdge) {
      edges = allEdges.slice(cursorIndex + 1, allEdges.length);
    }

  }

  if (before) {
    let cursorIndex = null;
    let beforeEdge = null;

    allEdges.some((edge, index) => {
      if (edge && edge._id && edge._id.toString() === before) {
        cursorIndex = index;
        beforeEdge = edge;
        return true;
      }
    });

    if (beforeEdge) {
      edges = allEdges.slice(0, cursorIndex);
    }
  }

  return edges;
}

/**
 * has the current list a previous page
 * @private
 *
 * @param {array) allEdges - list of all edges
 * @param {object} args - arguments, coming from graphql request
 * @return {boolean} hasPreviousPage - true, if it has a previous page
 */

function hasPreviousPage(allEdges, args) {
  const { last, before, after } = args;

  if (!last) return false;

  const edges = applyCursorsToEdges(allEdges, before, after);
  
  if (edges.length > last) return true;

  return false;
 }

 /**
  * has the current list a next page
  * @private
  *
  * @public
  * @param {array) allEdges - list of all edges
  * @param {object} args - arguments, coming from graphql request
  * @return {boolean} hasPreviousPage - true, if it has a previous page
  */

function hasNextPage(allEdges, args) {
  const { first, before, after } = args;

  if (!first) return false;

  const edges = applyCursorsToEdges(allEdges, before, after);

  if (edges.length > first) return true;

  return false;
}


