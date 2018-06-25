import subprocess
import sys

JAVERT = "/Users/rsz/JavaScriptVerification/environment/"
JS_2_JSIL = "js2jsil.native"
JSIL_VERIFY = "jsilverify.native"

subprocess.run([JAVERT + JS_2_JSIL, "-file", sys.argv[1], "-logic", "-unfolds"])
subprocess.run([JAVERT + JSIL_VERIFY, "-file", sys.argv[1] + "il"])
