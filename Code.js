/* Code.gs */

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('MPP Online Voting System')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getSheet(sheetName) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
}

// --- USER LOGIN ---
function loginUser(username, password) {
  var sheet = getSheet('Voters');
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(username) && String(data[i][1]) === String(password)) {
      return { success: true, username: username, hasVoted: data[i][2] }; 
    }
  }
  return { success: false, message: "Invalid Username or Password" };
}

// --- NEW: ADMIN LOGIN ---
function loginAdmin(adminID, password) {
  var sheet = getSheet('Admins'); // Make sure you have an 'Admins' tab
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    // Check AdminID and Password
    if (String(data[i][0]) === String(adminID) && String(data[i][1]) === String(password)) {
      return { success: true }; 
    }
  }
  return { success: false, message: "Invalid Admin Credentials" };
}

// --- GET CANDIDATES (For Voters) ---
function getCandidates() {
  var sheet = getSheet('Candidates');
  var data = sheet.getDataRange().getValues();
  data.shift(); 
  return data.map(function(row) {
    return {
      id: row[0],
      name: row[1],
      position: row[2],
      course: row[3],     
      image: processDriveLink(row[4])
    };
  });
}

// --- NEW: GET RESULTS (For Admin Charts) ---
function getVoteResults() {
  var sheet = getSheet('Candidates');
  var data = sheet.getDataRange().getValues();
  data.shift(); // Remove headers
  
  // Return just the data needed for charts: Name, Position, VoteCount
  return data.map(function(row) {
    return {
      name: row[1],       // Col B
      position: row[2],   // Col C
      voteCount: row[5]   // Col F (Votecount)
    };
  });
}

function processDriveLink(url) {
  if (!url) return 'https://via.placeholder.com/150?text=No+Image';
  if (url.toString().indexOf("drive.google.com") !== -1) {
    var idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      return "https://drive.google.com/thumbnail?id=" + idMatch[1] + "&sz=w1000";
    }
  }
  return url; 
}

function submitVote(username, selectedCandidates) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); 
    var voterSheet = getSheet('Voters');
    var candidateSheet = getSheet('Candidates');
    
    var voters = voterSheet.getDataRange().getValues();
    var voterRow = -1;
    for (var i = 1; i < voters.length; i++) {
      if (String(voters[i][0]) === String(username)) {
        if (voters[i][2] === true || voters[i][2] === "TRUE") return { success: false, message: "Already voted!" };
        voterRow = i + 1; 
        break;
      }
    }
    if (voterRow === -1) return { success: false, message: "User not found." };

    var candidates = candidateSheet.getDataRange().getValues();
    for (var pos in selectedCandidates) {
      var cID = selectedCandidates[pos];
      for (var j = 1; j < candidates.length; j++) {
        if (candidates[j][0] == cID) {
          var currentCount = candidates[j][5];
          candidateSheet.getRange(j + 1, 6).setValue(currentCount + 1);
          break;
        }
      }
    }
    
    voterSheet.getRange(voterRow, 3).setValue(true); 
    voterSheet.getRange(voterRow, 4).setValue(new Date()); 
    return { success: true, message: "Vote submitted!" };
    
  } catch (e) {
    return { success: false, message: "Error: " + e };
  } finally {
    lock.releaseLock();
  }
}