freight-truck
=============

S3 uploader grunt task

Required options:

`files`: expects an array of files

`cdn`: an object expecting 3 attributes

    `bucket`: S3 bucket name

    `key`: your S3 key

    `secret`: your S3 secret

`remotePath`: any folder you want you file put in

`useLocalFolderStructure`: boolean, false means only the file is uploaded to the sha1 folder, true means that it mimics the local folder structure

`baseDir`: the base directory