# iisnode configuration

## Install iisnode

Download .msi from [Azure/iisnode](https://github.com/Azure/iisnode). 
Running the MSI will install **iisnode** module into IIS.

## Deploy Node Application

Create a folder under C:\inetpub, or your desired location, and copy your node application there. 
Run "npm i" to install the node_modules dependencies.

## Create IIS Application

In Internet Service Manager create a website or virtual application under an existing website.  
The path for virtual applications should be /node unless you've changed the path in your API.
The web.config copied with your node application should handle the rest.

## web.config

The web.config from the @dictadata/storage-node should be ready to handle basic configuration of the node.js app.
Copy web.config to your project and deployed node application. Modify if needed.

## Checking IIS Configuration

In Internet Service Manager check the following for the web site or application.

* Check the Modules settings.  _iisnode_ should be installed.
* Check the Handler Mappings settings.  There should be an entry named _Javascript_.
* Check the URL Rewrite settings. There should be an entry named _storage-node_.

## Enable Handler Mappings for IIS Application

You may see an error message in Internet Service Manager when clicking "Handler Mappings" stating some about **overrideMode="Deny"**.  
If you browse to the app you will see a 501.19 error with the same **overrideMode="Deny"** message.  

Follow the below steps to unlock the handlers at the parent level:

* In Internet Service Manager, go to your server node and then to your website.
* For the website, in the right window you will see **Configuration Editor** under Management.
* Double click on the Configuration Editor.
* In the window that opens, on top you will find a drop down for sections. Choose _"system.webServer/handlers"_ from the drop down.
* On the right side, there is another drop down. Choose _"ApplicationHost.Config"_
* On the right most pane, you will find _"Section"_ heading. Click on **"Unlock Section"** under that.
* Once the handlers at the ApplicationHost.Config is unlocked, your website should run fine.
