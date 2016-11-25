OpenATBackend
================

OpenATBackend is a node server that has the following API routes:

* GET /add/[site-id]/[site-specific-/-parts]

	where site-id is one of:
 
	* github
	* sourceforge
	* instructables
	* pinshape
	* thingiverse
 
	And site-specific-/-parts relates to a project page url. E.g.

	* /add/github/acecentre/aacnews (relates to http://github.com/acecentre/aacnews) 
	* /add/sourceforge/projects/sawat (relates to http://sourceforge.net/projects/sawat)
	* /add/instructables/id/Eye-controlled-wheelchair  (relates to http://instructables.com/id/Eye-controlled-wheelchair/)
	* /add/pinshape/items/25871-3d-printed-slo-printed-lens-camera (relates to https://pinshape.com/items/25871-3d-printed-slo-printed-lens-camera)
	* /add/thingiverse/thing:180296 (relates to http://www.thingiverse.com/thing:180296)


	It will return either success:JSON feed of data from the URL or error:message. e.g.

	`{success: { short_title:"sawat", title :"SAW - Special Access to Windows",type:"software",authors:"mlundalv, stuartaw, walsh_jc",License:"GNU General Public License version 3.0 (GPLv3)",datemod:"2016-10-22 00:00",download_url:"http://www.sourceforge.net//projects/sawat/files/latest/download",project_url:"http://www.oatsoft.org/Software/SpecialAccessToWindows",description:"SAW - Special Access to Windows download. SAW - Special Access to Windows 2016-10-22 19:28:58 free download. SAW - Special Access to Windows SAW - Special Access to Windows - a programmable on-screen keyboard.",main_description:"SAW - Special Access to Windows - is a programmable on-screen keyboard. It is a powerful tool for providing Access to the Windows operating system for people who need alternative Switch or Pointing device input options.  \nThe new SAW 6 version - supported by the AEGIS project ([http://www.aegis-project.eu/](http://www.aegis-project.eu/)) - is now available. It is fully Windows 7-10 compatible, supports Unicode, includes its own \"Blade\" word prediction and abbreviation expansion engine, can interact with the CCF-SymbolServer for graphic symbol support ([http://conceptcoding.org/](http://conceptcoding.org/)), and adds several other feautures to make creating interfaces easy for those who use alternative inputs.",image:"images/full/saw",thumb:"images/thumb/saw",original_url:"https://github.com/alandmoore/wcgbrowser"}`

	`{ error: "page not found"}`

* POST /save/ (where a JSON formatted feed is posted)

It will return either success:short_title name or error:message




Notes:
======

Code for gitPush are in ./js/git.
There are 3 functional js files:
    commandProcess, runCommand: for using git-cmd
    git.controller.js: for using nodegit, simplegit


Credits
====

Original structure by Dante Greeve Nov. 2016
