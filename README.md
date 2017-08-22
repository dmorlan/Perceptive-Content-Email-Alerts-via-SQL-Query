# Perceptive-Content-Email-Alerts-via-SQL-Query
	Name:           AlertNewDocs.js
	Author:         Dustin Morlan
	Created:        11/08/2016 - DDM
	Last Updated:   11/16/2016 - DDM
	For Perceptive Content Version:    7.1.x
	Script Version: 1.1
  
Alert script for use with Perceptive Content

This is a script that can be setup to be run as Inbound, Within, or Outbound iScript on workflow queues.

The purpose is to query the CampusNexus database to find the first counselor email address for the specific student.

Note that any custom query can be used for the 'queryStr' variable so long as it returns an email address.

All config variables must be provided for the script to work. This includes variables: 'ODBC_DSN', 'ODBC_UNAME', 'ODBC_PASS', and 'emailConfig'.

The query included in this repo was setup to query CampusNexus v.17.1.0.353.




