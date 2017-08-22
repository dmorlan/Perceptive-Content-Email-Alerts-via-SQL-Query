/********************************************************************************
	Name:           AlertNewDocs.js
	Author:         Dustin Morlan
	Created:        11/08/2016 - DDM
	Last Updated:   11/16/2016 - DDM
	For Version:    7.1.x
	Script Version: 1.1
--------------------------------------------------------------------------------
	
	Summary:
	
	This script queries the CampusNexus database with the student ID to retrieve all emails for 
	counselors with students applications/enrollments in certain statuses (speicifed within query) and send an email alert 
	to the first counselor found indicating the document is now available.
		
	Mod Summary:
		11-15-2016: DDM: Script completed with functioning query to receive all emails.
		
********************************************************************************/
#link "sedbc"
#link "secomobj"
// ********************* Include additional libraries *******************
//STL packages
#if defined(imagenowDir6)
	// 6.7.0.2717+, including Active-Active support
	#include "$IMAGENOWDIR6$/script/STL/packages/Email/iEmail.js"
    #include "$IMAGENOWDIR6$/script/STL/packages/Logging/iScriptDebug.js"
	#include "$IMAGENOWDIR6$/script/STL/packages/Object/hashKeysToUpperCase.js"
	#include "$IMAGENOWDIR6$/script/STL/packages/Workflow/routeItem.js"
	#include "$IMAGENOWDIR6$/script/STL/packages/Email/iEmail.js"
	#include "$IMAGENOWDIR6$/script/STL/packages/Workflow/routeItem.js"
	#include "$IMAGENOWDIR6$/script/STL/packages/Database/DBAccess.js"
	#include "$IMAGENOWDIR6$/script/STL/packages/Date/convertToDateStr.js"
	

#else
	// pre-6.7.0.2717, no Active-Active support
    #include "../script/STL/packages/Email/iEmail.js"
	#include "../script/STL/packages/Logging/iScriptDebug.js"
	#include "../script/STL/packages/Object/hashKeysToUpperCase.js"
	#include "../script/STL/packages/Workflow/routeItem.js"
#endif

// *********************         Configuration        *******************

#define CONFIG_VERIFIED true
var ODBC_DSN= 	"<< INSERT ODBC DSN>>";
var ODBC_UNAME= "<< INSERT ODBC USER NAME>>" ;
var ODBC_PASS= 	"<< INSERT ODBC PASSWORD>>";

//Query to determine counselor email address in CampusVue database is assigned as queryStr
var queryStr =  "SELECT EMAILS = STUFF((SELECT DISTINCT ', ' + SF.EMAIL FROM SyStudent S JOIN AdEnroll AE ON S.SyStudentId = AE.SyStudentID JOIN SyStaff SF on AE.AmRepID = SF.SyStaffID WHERE S.StuNum = '<<STUDENTID>>' and AE.SySchoolStatusid IN (4, 5, 13, 51, 58, 67, 78) FOR XML PATH('')), 1, 1, '')"


//Configuration for email server and email message
var emailConfig = {
	smtp:       "<<INSERT SMTP SERVER>>",
	from:       "<<INSERT FROM ADDRESS>>",
	cc:         "",
	bcc:        "",
	subject:     "<<EMAIL SUBJECT>>",
	body:       "Document " + wfDoc.docTypeName + " has been received for student " + wfDoc.tab + " on " + displayDate + ". \n\n You may access this document via Perceptive Content.",
	IsHTML:     false,
	useUtility: false,
};

//Logging
#define LOG_TO_FILE         true    // false - log to stdout if ran by intool, true - log to inserverXX/log/ directory
#define DEBUG_LEVEL         5	  	// 0 - 5.  0 least output, 5 most verbose
#define SPLIT_LOG_BY_THREAD false   // set to true in high volume scripts when multiple worker threads are used (workflow, external message agent, etc)
#define MAX_LOG_FILE_SIZE   100     // Maximum size of log file (in MB) before a new one will be created

// *********************       End  Configuration     *******************

// ********************* Initialize global variables ********************
var EXECUTION_METHODS = ["WORKFLOW"]; //Allowed script execution methods: WORKFLOW, INTOOL, TASK, EFORM, EMA
var debug, hostDB = "";


/**
 * Main body of script.
 * @method main
 * @return {Boolean} True on success, false on error.
 */
function main ()
{
	try
	{
		debug = new iScriptDebug("USE SCRIPT FILE NAME", LOG_TO_FILE, DEBUG_LEVEL, undefined, {splitLogByThreadID:SPLIT_LOG_BY_THREAD, maxLogFileSize:MAX_LOG_FILE_SIZE, queueName:currentWfItem.queueName});
		debug.showINowInfo("INFO");
		debug.logAlways("INFO", "Script Version: AlertNewDocs.js v_1.0.0.0\n");
		debug.logAlways("INFO", "Script Name: %s\n", _argv[0]);
		
		if(!CONFIG_VERIFIED)
		{
			var errorStr = "Configuration not verified.  Please verify \n" +
			"the defines in the *** Configuration *** section at the top \n" +
			"of this script and set CONFIG_VERIFIED to true.  Aborting.\n\n";
			debug.log("CRITICAL", errorStr);
			INprintf(errorStr);
			return;
		}
		
		// check script execution
		if (!debug.checkExecution(EXECUTION_METHODS))
		{
			debug.log("CRITICAL", "This iScript is running as [%s] and is designed to run from [%s]\n", debug.getExecutionMethod(), EXECUTION_METHODS); 
			return false;
		}
				
		//Initialize database connection
		hostDB = new DBAccess('ODBC', ODBC_DSN, ODBC_UNAME, ODBC_PASS);
		if (!hostDB.open())
		{
			debug.log('CRITICAL', "Unable to open DB [%s]\n", ODBC_DSN);
			return false;
		}
			
		//Get current document information and query the CampusNexus database for counselor email addresses
		var wfItem = new INWfItem(currentWfItem.id);
		wfItem.getInfo();
		var wfDoc = new INDocument(wfItem.objectId);
		wfDoc.getInfo();

		var SQLQuery = queryStr.replace("<<STUDENTID>>", wfDoc.folder);
		
		debug.log("INFO", "Running query: [%s]\n", SQLQuery);
		var counselorEmail = hostDB.lookup(SQLQuery, 1);
		debug.log("INFO", "Email found: [%s] \n", counselorEmail);
		var date = new Date();
		var displayDate = convertToDateStr(date, "MM/DD/YYYY");
		//Check to see if no emails were found
		if (counselorEmail === null)
		{
			debug.log('ERROR', "Database error, skipping item.\n");
			var counselorEmail = ""
		}
		else if (!counselorEmail)
		{
			debug.log('ERROR', "No records found for query [%s] .  Moving to next item.\n", counselorEmail);
			return false;
		}
		
		
		var emailTo = counselorEmail;
		var email = new iEmail(emailTo, emailConfig);

		if (!email.send())
		{
			debug.log("ERROR", "Failed to send e-mail to [%s]\n", emailTo);
		}	
	}
	
	catch(e)
	{
		if (!debug)
		{
			printf("\n\nFATAL iSCRIPT ERROR: %s\n\n", e.toString());
		}
		else
		{
			debug.setIndent(0);
			debug.log("CRITICAL", "***********************************************\n");
			debug.log("CRITICAL", "***********************************************\n");
			debug.log("CRITICAL", "**                                           **\n");
			debug.log("CRITICAL", "**    ***    Fatal iScript Error!     ***    **\n");
			debug.log("CRITICAL", "**                                           **\n");
			debug.log("CRITICAL", "***********************************************\n");
			debug.log("CRITICAL", "***********************************************\n");
			debug.log("CRITICAL", "\n\n\n%s\n\n\n", e.toString());
			debug.log("CRITICAL", "\n\nThis script has failed in an unexpected way.\n\n", _argv[0]);
			debug.log("CRITICAL", "***********************************************\n");
			debug.log("CRITICAL", "***********************************************\n");
			if (DEBUG_LEVEL < 3 && typeof(debug.getLogHistory) === "function")
			{
				debug.popLogHistory(11);
				debug.log("CRITICAL", "Log History:\n\n%s\n\n", debug.getLogHistory());
			}
		}
	}
	
	finally
	{
		if (typeof(stats) == "object")
		{
			if (debug) debug.logAlways("NOTIFY", "Done:\n\n%s\n", stats.getSortedStats());
			else printf("Done:\n\n%s\n", stats.getSortedStats());
		}
		if (debug) debug.finish();
	}
}
// ********************* function definitions ****************************************
//No custom functions for this script
//-- last line must be a comment --
