@echo off
echo 自签名脚本
pause

rem 主目录名称,可以修改
set DIR_NAME=ca

rem 证书参数:
rem CAP_C=国家, CAP_ST=洲/省, CAP_L=城/镇, CAP_O=组织名, CAP_OU=单位名, 
rem CAP_CN=httpd-ssl.conf中的ServerName 名称, CAP_EM=邮箱
set CAP_C=CN
set CAP_ST=liaoning
set CAP_L=dalian
set CAP_O=zhirong company
set CAP_OU=IT
set CAP_CN=zhirong
set CAP_EM=zhirong@google.com

rem 私钥,可以修改
set CA_PASS=998877a
set SER_PASS=12345
set CLI_PASS=%SER_PASS%
set SER_P12_PASS=%SER_PASS%
set CLI_P12_PASS=%SER_PASS%


rem 创建目录
md %DIR_NAME%
cd %DIR_NAME%
md demoCA
md demoCA\newcerts
md demoCA\private
echo 01>demoCA\serial
copy nul demoCA\index.txt


echo 生成X509格式的CA自签名证书 
openssl genrsa -out ca.key 1024 -passin pass:%CA_PASS% -days 3650
openssl req -new -x509 -key ca.key -passin pass:%CA_PASS% -days 3650  -out ca.crt -subj "/C=%CAP_C%/ST=%CAP_ST%/L=%CAP_L%/O=%CAP_O%/OU=%CAP_OU%/CN=%CAP_CN%/emailAddress=%CAP_EM%"

echo 生成服务端的私钥(key文件)及csr 文件
openssl genrsa -des3 -passout pass:%SER_PASS% -out server.key 1024
openssl req -new -passin pass:%SER_PASS% -key server.key -days 3650 -out server.csr -subj "/C=%CAP_C%/ST=%CAP_ST%/L=%CAP_L%/O=%CAP_O%/OU=%CAP_OU%/CN=%CAP_CN%/emailAddress=%CAP_EM%"

echo 生成客户端的私钥(key文件)及csr文件 
openssl genrsa -des3 -passout pass:%CLI_PASS% -out client.key 1024
openssl req -new -passin pass:%CLI_PASS% -key client.key -days 3650 -out client.csr -subj "/C=%CAP_C%/ST=%CAP_ST%/L=%CAP_L%/O=%CAP_O%/OU=%CAP_OU%/CN=%CAP_CN%/emailAddress=%CAP_EM%"

echo 用生成的CA的证书为刚才生成的server.csr,client.csr文件签名 
openssl ca -key %CA_PASS% -in server.csr -out server.crt -cert ca.crt -keyfile ca.key -batch
openssl ca -key %CA_PASS% -in client.csr -out client.crt -cert ca.crt -keyfile ca.key -batch

echo 生成p12格式证书 （思科是.p12,微软是.pfx）
openssl pkcs12 -export -inkey client.key  -passin pass:%CLI_PASS% -in client.crt -out client.pfx -passout pass:%CLI_P12_PASS%
openssl pkcs12 -export -inkey server.key -passin pass:%SER_PASS% -in server.crt -out server.pfx -passout pass:%SER_P12_PASS%

echo 生成pem格式证书 
cat client.crt client.key > client.pem 
cat server.crt server.key > server.pem



rem exit.
cd ..