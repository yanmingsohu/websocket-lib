@echo off
echo ��ǩ���ű�
pause

rem ��Ŀ¼����,�����޸�
set DIR_NAME=ca

rem ֤�����:
rem CAP_C=����, CAP_ST=��/ʡ, CAP_L=��/��, CAP_O=��֯��, CAP_OU=��λ��, 
rem CAP_CN=httpd-ssl.conf�е�ServerName ����, CAP_EM=����
set CAP_C=CN
set CAP_ST=liaoning
set CAP_L=dalian
set CAP_O=zhirong company
set CAP_OU=IT
set CAP_CN=zhirong
set CAP_EM=zhirong@google.com

rem ˽Կ,�����޸�
set CA_PASS=998877a
set SER_PASS=12345
set CLI_PASS=%SER_PASS%
set SER_P12_PASS=%SER_PASS%
set CLI_P12_PASS=%SER_PASS%


rem ����Ŀ¼
md %DIR_NAME%
cd %DIR_NAME%
md demoCA
md demoCA\newcerts
md demoCA\private
echo 01>demoCA\serial
copy nul demoCA\index.txt


echo ����X509��ʽ��CA��ǩ��֤�� 
openssl genrsa -out ca.key 1024 -passin pass:%CA_PASS% -days 3650
openssl req -new -x509 -key ca.key -passin pass:%CA_PASS% -days 3650  -out ca.crt -subj "/C=%CAP_C%/ST=%CAP_ST%/L=%CAP_L%/O=%CAP_O%/OU=%CAP_OU%/CN=%CAP_CN%/emailAddress=%CAP_EM%"

echo ���ɷ���˵�˽Կ(key�ļ�)��csr �ļ�
openssl genrsa -des3 -passout pass:%SER_PASS% -out server.key 1024
openssl req -new -passin pass:%SER_PASS% -key server.key -days 3650 -out server.csr -subj "/C=%CAP_C%/ST=%CAP_ST%/L=%CAP_L%/O=%CAP_O%/OU=%CAP_OU%/CN=%CAP_CN%/emailAddress=%CAP_EM%"

echo ���ɿͻ��˵�˽Կ(key�ļ�)��csr�ļ� 
openssl genrsa -des3 -passout pass:%CLI_PASS% -out client.key 1024
openssl req -new -passin pass:%CLI_PASS% -key client.key -days 3650 -out client.csr -subj "/C=%CAP_C%/ST=%CAP_ST%/L=%CAP_L%/O=%CAP_O%/OU=%CAP_OU%/CN=%CAP_CN%/emailAddress=%CAP_EM%"

echo �����ɵ�CA��֤��Ϊ�ղ����ɵ�server.csr,client.csr�ļ�ǩ�� 
openssl ca -key %CA_PASS% -in server.csr -out server.crt -cert ca.crt -keyfile ca.key -batch
openssl ca -key %CA_PASS% -in client.csr -out client.crt -cert ca.crt -keyfile ca.key -batch

echo ����p12��ʽ֤�� ��˼����.p12,΢����.pfx��
openssl pkcs12 -export -inkey client.key  -passin pass:%CLI_PASS% -in client.crt -out client.pfx -passout pass:%CLI_P12_PASS%
openssl pkcs12 -export -inkey server.key -passin pass:%SER_PASS% -in server.crt -out server.pfx -passout pass:%SER_P12_PASS%

echo ����pem��ʽ֤�� 
cat client.crt client.key > client.pem 
cat server.crt server.key > server.pem



rem exit.
cd ..